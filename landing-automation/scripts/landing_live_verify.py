#!/usr/bin/env python3
"""Production readback: verify the DEPLOYED page matches repo + App Store.

The parity gate proves the repository is correct; this gate proves the world
is. It fetches the live site and fails closed unless all three agree:

  1. live data/landing-apps.generated.json == the repo file (deploy landed)
  2. every non-excluded publicly released app is `released` in the LIVE data
     (store ⊆ production, independent of any repo state)
  3. live index.html contains a card link for every released app and a
     JSON-LD ItemList whose count matches (the page users see is complete)

Retries with backoff absorb CDN propagation. Production readback has no circuit
breaker: a mismatch in the page users actually receive always remains a block.

Exit codes: 0 = production verified, 1 = drift (fail closed), 2 = config error.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import landing_parity_gate as gate
import store_discovery as sd
import update_landing_data as uld

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BASE_URL = "https://apps.allnew.work"


def fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "allnew-landing-verify/1.0", "Cache-Control": "no-cache"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:  # nosec: fixed production origin
        return response.read().decode("utf-8")


def canonical_json(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def live_json_matches_repo(live: dict[str, Any], repo: dict[str, Any]) -> bool:
    return canonical_json(live) == canonical_json(repo)


def released_slugs(data: dict[str, Any]) -> list[str]:
    return [
        str(entry.get("slug"))
        for entry in data.get("apps", [])
        if isinstance(entry, dict) and entry.get("status") == "released"
    ]


class _WorkCardParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.card_hrefs: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.casefold() != "a":
            return
        values = {key.casefold(): value or "" for key, value in attrs}
        classes = set(values.get("class", "").split())
        href = values.get("href", "")
        if "work-card" in classes and href:
            self.card_hrefs.add(href)


def html_missing_slugs(html: str, slugs: list[str]) -> list[str]:
    parser = _WorkCardParser()
    parser.feed(html)
    present = {
        href.removeprefix("/").split("/", 1)[0]
        for href in parser.card_hrefs
        if "/" in href.removeprefix("/")
    }
    return [slug for slug in slugs if slug not in present]


def html_itemlist_count(html: str) -> int:
    for body in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict) and parsed.get("@type") == "ItemList":
            return int(parsed.get("numberOfItems", -1))
    return -1


def verify_once(
    base_url: str,
    repo_json: dict[str, Any],
    lookup: dict[str, dict[str, dict[str, Any]]],
    catalog: dict[str, Any],
    exclusions: dict[str, dict[str, Any]],
) -> list[str]:
    """One verification pass against production. Returns a list of problems."""
    problems: list[str] = []

    live_data = json.loads(fetch_text(f"{base_url}/data/landing-apps.generated.json"))
    if not live_json_matches_repo(live_data, repo_json):
        problems.append("live landing-apps.generated.json differs from the repo file")

    live_report = gate.evaluate_parity(lookup, live_data, catalog, exclusions)
    for item in live_report["missing"]:
        # Catalog membership is a repo concern; here only production visibility counts.
        production_problems = [p for p in item["problems"] if p != "not in app_catalog.json"]
        if production_problems:
            problems.append(
                f"live data: {item['app_id']} {item['name']}: {'; '.join(production_problems)}"
            )

    html = fetch_text(f"{base_url}/")
    slugs = released_slugs(live_data)
    for slug in html_missing_slugs(html, slugs):
        problems.append(f"live index.html: card link missing for {slug}")
    itemlist_count = html_itemlist_count(html)
    if itemlist_count != len(slugs):
        problems.append(
            f"live index.html: JSON-LD ItemList count {itemlist_count} != released apps {len(slugs)}"
        )

    return problems


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify production page against repo and App Store")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--output", type=Path, default=ROOT / "data" / "landing-apps.generated.json")
    parser.add_argument("--catalog", type=Path, default=gate.CATALOG_PATH)
    parser.add_argument("--exclusions", type=Path, default=gate.EXCLUSIONS_PATH)
    parser.add_argument("--lookup-file", type=Path, default=None)
    parser.add_argument(
        "--allow-lookup-fixture",
        action="store_true",
        help="Tests only: use the supplied lookup cache instead of live App Store grounding",
    )
    parser.add_argument("--retries", type=int, default=6)
    parser.add_argument("--interval", type=float, default=15.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    catalog = uld.load_json(args.catalog, {})
    repo_json = uld.load_json(args.output, {})
    if not catalog.get("apps") or not repo_json.get("apps"):
        print("[LIVE:ERROR] catalog or generated data missing")
        return 2
    try:
        exclusions = gate.load_exclusions(args.exclusions)
    except ValueError as error:
        print(f"[LIVE:ERROR] {error}")
        return 2

    artist_id = str(catalog.get("artist_id") or "")
    if not artist_id:
        print("[LIVE:ERROR] artist_id missing from catalog")
        return 2
    if args.lookup_file and args.allow_lookup_fixture:
        try:
            lookup = sd.load_lookup_cache(args.lookup_file)
        except ValueError as error:
            print(f"[LIVE:ERROR] {error}")
            return 2
    else:
        # Production readback is grounded at verification time, not in a
        # pre-deploy /tmp snapshot that third-party deployment code can alter.
        lookup = sd.fetch_artist_lookup(artist_id)

    problems: list[str] = ["not yet verified"]
    for attempt in range(1, max(args.retries, 1) + 1):
        try:
            problems = verify_once(args.base_url, repo_json, lookup, catalog, exclusions)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            problems = [f"fetch failed: {type(error).__name__}"]
        if not problems:
            print(f"[LIVE:PASS] production verified on attempt {attempt}")
            return 0
        if attempt < args.retries:
            print(f"[LIVE:RETRY] attempt {attempt}: {len(problems)} problem(s); waiting {args.interval}s")
            time.sleep(args.interval)

    for problem in problems:
        print(f"[LIVE:BLOCK] {problem}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

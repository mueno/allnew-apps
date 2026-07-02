#!/usr/bin/env python3
"""Fail-closed parity gate: every publicly released AllNew app must be on the LP.

External grounding signal: the iTunes Lookup artist listing (what the world can
actually see on the App Store), never internal state or self-reported events.

Verdict rules:
  - Every public app id must appear in data/landing-apps.generated.json with
    status "released" and an app_store_url — unless explicitly excluded in
    config/parity_exclusions.json (each exclusion requires a reason).
  - A missing app is a BLOCK: exit 1 so CI turns red and the ANDON issue opens.
    Warnings (stale LP entries no longer public, enrichment backlog) never block.

Escape valve (circuit breaker): state/parity_circuit_breaker.json with an
expires_at timestamp downgrades BLOCK to WARN until it expires. Use only while
a confirmed false positive is being fixed; the report records its use.

Exit codes: 0 = parity OK, 1 = parity violation (fail closed), 2 = config error.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import store_discovery
import update_landing_data as uld

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "landing-automation" / "config" / "app_catalog.json"
OUTPUT_PATH = ROOT / "data" / "landing-apps.generated.json"
EXCLUSIONS_PATH = ROOT / "landing-automation" / "config" / "parity_exclusions.json"
CIRCUIT_BREAKER_PATH = ROOT / "landing-automation" / "state" / "parity_circuit_breaker.json"
REPORT_PATH = ROOT / "landing-automation" / "state" / "parity_report.json"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def load_exclusions(path: Path) -> dict[str, dict[str, Any]]:
    payload = uld.load_json(path, {"exclusions": []})
    exclusions: dict[str, dict[str, Any]] = {}
    for item in payload.get("exclusions", []):
        if not isinstance(item, dict):
            continue
        app_id = str(item.get("app_id") or "")
        reason = str(item.get("reason") or "").strip()
        if not app_id or not reason:
            raise ValueError(
                "parity_exclusions.json entries require both app_id and a non-empty reason"
            )
        exclusions[app_id] = item
    return exclusions


def circuit_breaker_active(path: Path) -> tuple[bool, str]:
    payload = uld.load_json(path, None)
    if not isinstance(payload, dict):
        return False, ""
    expires_at = uld.parse_iso_datetime(payload.get("expires_at"))
    reason = str(payload.get("reason") or "unspecified")
    if expires_at and expires_at > now_utc():
        return True, reason
    return False, ""


def evaluate_parity(
    lookup: dict[str, dict[str, dict[str, Any]]],
    generated: dict[str, Any],
    catalog: dict[str, Any],
    exclusions: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Pure comparison of ground truth vs landing data. Returns a report dict."""
    public_ids = set(lookup.get("jp", {})) | set(lookup.get("us", {}))

    lp_by_app_id: dict[str, dict[str, Any]] = {}
    for entry in generated.get("apps", []):
        if isinstance(entry, dict) and entry.get("asc_app_id"):
            lp_by_app_id[str(entry["asc_app_id"])] = entry

    catalog_ids = {
        str(app.get("asc_app_id"))
        for app in catalog.get("apps", [])
        if app.get("asc_app_id")
    }

    missing: list[dict[str, Any]] = []
    excluded: list[str] = []
    for app_id in sorted(public_ids):
        if app_id in exclusions:
            excluded.append(app_id)
            continue
        track = lookup.get("jp", {}).get(app_id) or lookup.get("us", {}).get(app_id) or {}
        lp_entry = lp_by_app_id.get(app_id)
        problems: list[str] = []
        if app_id not in catalog_ids:
            problems.append("not in app_catalog.json")
        if lp_entry is None:
            problems.append("not in landing-apps.generated.json")
        else:
            if lp_entry.get("status") != "released":
                problems.append(f"status={lp_entry.get('status')} (expected released)")
            if not lp_entry.get("app_store_url"):
                problems.append("app_store_url missing")
        if problems:
            missing.append(
                {
                    "app_id": app_id,
                    "name": str(track.get("trackName") or ""),
                    "problems": problems,
                }
            )

    stale = sorted(
        app_id
        for app_id, entry in lp_by_app_id.items()
        if app_id not in public_ids and entry.get("status") == "released"
    )

    enrichment = sorted(
        str(app.get("slug"))
        for app in catalog.get("apps", [])
        if app.get("auto_onboarded")
    )

    # Guard-precision signal: exclusions marked false_positive=true record
    # confirmed over-blocks of this gate (pillar A of the factory invariants).
    false_positive_ids = sorted(
        app_id
        for app_id, item in exclusions.items()
        if uld.as_bool(item.get("false_positive"), default=False)
    )

    return {
        "public_apps": len(public_ids),
        "landing_released": sum(
            1 for entry in lp_by_app_id.values() if entry.get("status") == "released"
        ),
        "missing": missing,
        "excluded_app_ids": excluded,
        "false_positive_exclusion_ids": false_positive_ids,
        "stale_landing_app_ids": stale,
        "enrichment_backlog": enrichment,
    }


def write_report(path: Path, report: dict[str, Any], verdict: str, breaker_reason: str) -> None:
    previous = uld.load_json(path, {})
    payload = {
        "schema_version": 1,
        "verdict": verdict,
        "circuit_breaker": breaker_reason or None,
        "updated_at": now_utc().replace(microsecond=0).isoformat(),
        **report,
    }
    comparable_prev = {k: v for k, v in previous.items() if k != "updated_at"}
    comparable_next = {k: v for k, v in payload.items() if k != "updated_at"}
    if comparable_prev == comparable_next and previous.get("updated_at"):
        payload["updated_at"] = previous["updated_at"]
    uld.save_json_if_changed(path, payload)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Landing/App Store parity gate (fail-closed)")
    parser.add_argument("--catalog", type=Path, default=CATALOG_PATH)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--exclusions", type=Path, default=EXCLUSIONS_PATH)
    parser.add_argument("--circuit-breaker", type=Path, default=CIRCUIT_BREAKER_PATH)
    parser.add_argument("--report", type=Path, default=REPORT_PATH)
    parser.add_argument("--artist-id", default=None)
    parser.add_argument(
        "--lookup-file",
        type=Path,
        default=None,
        help="Pre-fetched lookup payload (from store_discovery --lookup-cache)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    catalog = uld.load_json(args.catalog, {})
    generated = uld.load_json(args.output, {})
    if not catalog.get("apps"):
        print(f"[GATE:ERROR] catalog missing or empty: {args.catalog}")
        return 2
    try:
        exclusions = load_exclusions(args.exclusions)
    except ValueError as error:
        print(f"[GATE:ERROR] {error}")
        return 2

    if args.lookup_file:
        lookup = json.loads(args.lookup_file.read_text(encoding="utf-8"))
    else:
        artist_id = str(args.artist_id or catalog.get("artist_id") or "")
        if not artist_id:
            print("[GATE:ERROR] artist_id missing (catalog top-level or --artist-id)")
            return 2
        lookup = store_discovery.fetch_artist_lookup(artist_id)

    if not (set(lookup.get("jp", {})) | set(lookup.get("us", {}))):
        # Fail closed: an empty ground truth is indistinguishable from a broken signal.
        print("[GATE:BLOCK] artist lookup returned zero public apps")
        return 1

    report = evaluate_parity(lookup, generated, catalog, exclusions)
    breaker_active, breaker_reason = circuit_breaker_active(args.circuit_breaker)

    verdict = "pass"
    exit_code = 0
    if report["missing"]:
        if breaker_active:
            verdict = "warn_circuit_breaker"
            print(f"[GATE:WARN] circuit breaker active ({breaker_reason}); downgrading BLOCK")
        else:
            verdict = "block"
            exit_code = 1

    for item in report["missing"]:
        print(
            f"[GATE:{'WARN' if breaker_active else 'BLOCK'}] "
            f"{item['app_id']} {item['name']}: {'; '.join(item['problems'])}"
        )
    for app_id in report["stale_landing_app_ids"]:
        print(f"[GATE:WARN] landing shows released app no longer public: {app_id}")
    if report["enrichment_backlog"]:
        print(
            "[GATE:INFO] auto-onboarded apps awaiting human enrichment: "
            + ", ".join(report["enrichment_backlog"])
        )

    write_report(args.report, report, verdict, breaker_reason if breaker_active else "")
    print(
        f"[GATE:{verdict.upper()}] public={report['public_apps']} "
        f"landing_released={report['landing_released']} "
        f"missing={len(report['missing'])} excluded={len(report['excluded_app_ids'])}"
    )
    return exit_code


if __name__ == "__main__":
    sys.exit(main())

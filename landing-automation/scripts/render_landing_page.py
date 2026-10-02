#!/usr/bin/env python3
"""Render index.html sections from data/landing-apps.generated.json.

Closes the gap between the auto-updated landing data and the actual page:
- JSON-LD ItemList block (consumed by SEO + feedback portal / status board)
- work-card grids (health-grid / pet-grid / productivity-grid)
- footer app lists (footer-apps-health / footer-apps-pet / footer-apps-productivity)

Deterministic and idempotent: running twice yields identical output.
Fail-closed: exits non-zero if expected anchors are missing or output
fails validation, so CI stops instead of deploying a broken page.
"""

from __future__ import annotations

import html
import hashlib
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "landing-apps.generated.json"
INDEX_PATH = ROOT / "index.html"
BASE_URL = "https://apps.allnew.work"
RENDER_CONTRACT = "allnew.landing-render.v2"
GRID_CATEGORIES = ("health", "pet", "productivity")
FOOTER_LABELS = {"health": "Health", "pet": "Pet", "productivity": "Productivity"}
APPLICATION_CATEGORY = {
    "health": "HealthApplication",
    "pet": "HealthApplication",
    "productivity": "UtilitiesApplication",
}

CARD_TEMPLATE = """
                <a class="work-card" href="{support_path}">
                    <div class="work-card-img" style="background:#f5f5f5;">
                        {card_image_block}
                    </div>
                    <div class="work-card-body">
                        <div class="work-card-meta">
                            <img src="{icon}" alt="" class="work-card-icon">
                            <div class="work-card-names">
                                <div class="work-card-name">{name}</div>
                                <div class="work-card-ja">{name_ja}</div>
                            </div>
                        </div>
                        <span class="work-card-tag">{tag}</span>
                        <p class="work-card-desc">{desc}</p>
                    </div>
                    <div class="work-card-arrow"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4.5 12L12 4.5M12 4.5H6M12 4.5V11"/></svg></div>
                </a>
"""


def load_released_apps() -> list[dict]:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    apps = data if isinstance(data, list) else data.get("apps", [])
    return normalize_released_apps(apps)


def normalize_released_apps(apps: list[dict]) -> list[dict]:
    """One public listing per Store ID/slug, shared by grids and statistics."""
    result, ids, slugs = [], set(), set()
    for app in apps:
        if not isinstance(app, dict) or app.get("status") != "released":
            continue
        slug = str(app.get("slug") or "").strip()
        store_id = str(app.get("asc_app_id") or "").strip()
        if not slug or app.get("category") not in GRID_CATEGORIES:
            continue
        if slug in slugs or (store_id and store_id in ids):
            continue
        slugs.add(slug)
        if store_id:
            ids.add(store_id)
        result.append(app)
    return result


def render_statistics(page: str, apps: list[dict]) -> str:
    values = {"total-app-count": len(apps),
              "category-count": len({app["category"] for app in apps})}
    for element_id, value in values.items():
        pattern = rf'(<div class="stat-number" id="{element_id}">)[^<]*(</div>)'
        page, count = re.subn(pattern, lambda m: m[1] + str(value) + m[2], page)
        if count != 1:
            raise SystemExit(f"render_landing_page: unique statistic anchor missing: {element_id}")
    return page


def render_runtime_reference(page: str, runtime: bytes | None = None) -> str:
    # A new URL avoids a cached 404 after the runtime becomes deployable.
    relative = "landing-automation/runtime/landing-runtime.js"
    digest = hashlib.sha256(runtime if runtime is not None else (ROOT / relative).read_bytes()).hexdigest()[:16]
    pattern = rf'(<script src="{re.escape(relative)})(?:\?[^"<>]*)?("></script>)'
    page, count = re.subn(pattern, lambda m: m[1] + "?v=" + digest + m[2], page)
    if count != 1:
        raise SystemExit("render_landing_page: unique runtime reference missing")
    return page


def html_safe_json_dumps(payload: object) -> str:
    """Serialize JSON for safe embedding inside an HTML ``<script>`` element.

    ``json.dumps`` escapes ``"`` ``\\`` and control chars, but leaves ``<`` ``>``
    ``&`` raw. HTML parses ``<script>`` content as raw text and terminates the
    element at the first *case-insensitive* ``</script`` — even inside a JSON
    string — so a value such as ``</ScRiPt>...`` would break out of the JSON-LD
    block in the browser while still passing a naive lowercase-``</script>``
    validator. Encoding these characters as JSON ``\\uXXXX`` escapes keeps the
    payload valid JSON (``json.loads`` round-trips) yet makes it impossible to
    close the element from string data.
    """
    return (
        json.dumps(payload, ensure_ascii=False, indent=4)
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
    )


def build_json_ld(apps: list[dict]) -> str:
    items = []
    for position, app in enumerate(apps, start=1):
        slug = app["slug"]
        icon = str(app.get("icon_path") or f"{slug}-icon.png").split("?")[0]
        item: dict = {
            "@type": "MobileApplication",
            "name": app["name"],
            "alternateName": app.get("name_ja") or app["name"],
            "description": app.get("description_ja") or "",
            "url": f"{BASE_URL}/{slug}/",
            "image": f"{BASE_URL}/{icon}",
            "applicationCategory": APPLICATION_CATEGORY.get(
                app.get("category", ""), "MobileApplication"
            ),
            "operatingSystem": "iOS",
            "author": {"@type": "Organization", "name": "AllNew LLC"},
        }
        if app.get("app_store_url"):
            item["installUrl"] = app["app_store_url"]
        price = app.get("app_store_price")
        currency = app.get("app_store_currency")
        if (type(price) in (int, float) and math.isfinite(price) and price >= 0
                and isinstance(currency, str) and re.fullmatch(r"[A-Z]{3}", currency)):
            item["offers"] = {"@type": "Offer", "price": str(price), "priceCurrency": currency}
        items.append({"@type": "ListItem", "position": position, "item": item})

    payload = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "AllNew iOS Apps",
        "description": "健康管理・ペットケア・生産性向上の iOS アプリカタログ",
        "numberOfItems": len(apps),
        "itemListElement": items,
    }
    return html_safe_json_dumps(payload)


def replace_json_ld(page: str, json_ld: str) -> str:
    # スクリプトブロック単位で走査する。貪欲マッチで隣の JSON-LD
    # （Organization 等）を巻き込まないため、`</script>` を境界として
    # 各ブロックを個別に判定する。
    # re.I: browsers close a <script> at the first case-insensitive </script>,
    # so the block boundary must be matched case-insensitively too — otherwise a
    # mixed-case </ScRiPt> inside data slips past both replace and validation.
    pattern = re.compile(
        r'(<script type="application/ld\+json">)(.*?)(</script>)', re.I | re.S
    )
    for match in pattern.finditer(page):
        body = match.group(2)
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            continue
        if parsed.get("@type") == "ItemList":
            return (
                page[: match.start(2)]
                + "\n"
                + json_ld
                + "\n    "
                + page[match.end(2):]
            )
    raise SystemExit("render_landing_page: ItemList JSON-LD block not found")


def find_balanced_div(page: str, open_tag_start: int) -> tuple[int, int]:
    """Return (inner_start, inner_end) for the div opening at open_tag_start."""
    open_end = page.index(">", open_tag_start) + 1
    depth = 1
    for match in re.finditer(r"<div\b|</div>", page[open_end:]):
        depth += 1 if match.group(0) == "<div" else -1
        if depth == 0:
            return open_end, open_end + match.start()
    raise SystemExit("render_landing_page: unbalanced div")


def render_grid(page: str, category: str, apps: list[dict]) -> str:
    anchor = f'<div class="work-grid" id="{category}-grid">'
    start = page.find(anchor)
    if start == -1:
        raise SystemExit(f"render_landing_page: grid anchor missing: {category}-grid")
    inner_start, inner_end = find_balanced_div(page, start)

    cards = []
    for app in apps:
        if app.get("category") != category:
            continue
        # Card image is a real app screen (onboarding slide or store screenshot),
        # never the icon. Mirror the runtime (card_image_path || promo_image_path).
        # No real image -> render the empty grey box, not a blown-up icon.
        card_image = app.get("card_image_path") or app.get("promo_image_path") or ""
        if card_image:
            card_image_block = (
                f'<img src="{html.escape(card_image, quote=True)}" '
                f'alt="{html.escape(app["name"])}" loading="lazy">'
            )
        else:
            card_image_block = ""
        cards.append(
            CARD_TEMPLATE.format(
                support_path=html.escape(app.get("support_path") or f"{app['slug']}/?lang=ja", quote=True),
                card_image_block=card_image_block,
                name=html.escape(app["name"]),
                name_ja=html.escape(app.get("name_ja") or app["name"]),
                icon=html.escape(app.get("icon_path") or "", quote=True),
                tag=html.escape(app.get("input_methods_label") or "iOS App"),
                desc=html.escape(app.get("description_ja") or ""),
            )
        )
    rendered = "".join(cards) + "            "
    return page[:inner_start] + rendered + page[inner_end:]


def render_footer(page: str, category: str, apps: list[dict]) -> str:
    names = ", ".join(app["name"] for app in apps if app.get("category") == category)
    label = FOOTER_LABELS[category]
    pattern = re.compile(rf'(<p id="footer-apps-{category}">)[^<]*(</p>)')
    if not pattern.search(page):
        # フッターは任意セクション。存在しない場合はスキップする。
        return page
    return pattern.sub(rf"\g<1>{label}: {html.escape(names)}\g<2>", page)


def render_page(page: str, apps: list[dict], runtime: bytes | None = None) -> str:
    """The sole complete rendering contract for local and pinned cloud candidates."""
    apps = normalize_released_apps(apps)
    if not apps:
        raise SystemExit("render_landing_page: no released apps in generated data")

    page = replace_json_ld(page, build_json_ld(apps))
    page = render_statistics(page, apps)
    page = render_runtime_reference(page, runtime)
    for category in GRID_CATEGORIES:
        page = render_grid(page, category, apps)
        page = render_footer(page, category, apps)

    # 検証: 全 JSON-LD ブロックがパース可能で、ItemList が期待件数であること
    # （feedback portal / status board は静的 JSON-LD を DOMParser で読む前提）
    blocks = re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', page, re.I | re.S
    )
    item_lists = []
    for body in blocks:
        parsed = json.loads(body)  # どれか壊れていれば fail-closed
        if parsed.get("@type") == "ItemList":
            item_lists.append(parsed)
    if len(item_lists) != 1 or item_lists[0].get("numberOfItems") != len(apps):
        raise SystemExit("render_landing_page: JSON-LD validation failed")
    if page.count('class="work-card"') != len(apps):
        raise SystemExit("render_landing_page: card count mismatch")

    return page


def render_contract(runtime: bytes | None = None) -> dict:
    """Fingerprints of trusted local code, never values accepted from a candidate."""
    return {"version": RENDER_CONTRACT,
            "renderer_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "runtime_sha256": hashlib.sha256(runtime if runtime is not None else (ROOT / "landing-automation/runtime/landing-runtime.js").read_bytes()).hexdigest()}


def verify_candidate(directory: Path, expected_source: str) -> dict:
    """Read-only intake check; not publication authority or a replacement for parity."""
    if not re.fullmatch(r"[0-9a-f]{40}", expected_source):
        raise SystemExit("candidate: independently reviewed full source SHA required")
    contents = {}
    for name in ("candidate.json", "data.json", "index.html", "lookup.json"):
        path = directory / name
        if path.is_symlink() or not path.is_file() or path.stat().st_size > 5 * 1024 * 1024:
            raise SystemExit("candidate: invalid or oversized artifact")
        contents[name] = path.read_bytes()
    record = json.loads(contents["candidate.json"])
    if (record.get("source") != expected_source or record.get("render_contract") != render_contract()
            or record.get("published") is not False or record.get("status") != "candidate_ready"):
        raise SystemExit("candidate: stale source or render contract")
    hashes = {name: hashlib.sha256(contents[name]).hexdigest()
              for name in ("data.json", "index.html", "lookup.json")}
    if record.get("sha256") != hashes:
        raise SystemExit("candidate: artifact hash mismatch")
    data = json.loads(contents["data.json"])
    # Re-render from the trusted checkout template, not the candidate HTML.
    canonical = render_page(INDEX_PATH.read_text(encoding="utf-8"), data["apps"])
    if canonical.encode() != contents["index.html"]:
        raise SystemExit("candidate: HTML differs from canonical renderer")
    return {"verified": True, "publication_authorized": False,
            "source": expected_source, "render_contract": render_contract(), "sha256": hashes}


def main() -> None:
    apps = load_released_apps()
    page = render_page(INDEX_PATH.read_text(encoding="utf-8"), apps)

    if INDEX_PATH.read_text(encoding="utf-8") != page:
        INDEX_PATH.write_text(page, encoding="utf-8")
        print(f"render_landing_page: updated index.html ({len(apps)} released apps)")
    else:
        print("render_landing_page: no changes")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify-candidate", type=Path)
    parser.add_argument("--expected-source", help="Full independently approved site source commit")
    args = parser.parse_args()
    if args.verify_candidate:
        if not args.expected_source:
            parser.error("--expected-source is required for candidate intake")
        print(json.dumps(verify_candidate(args.verify_candidate, args.expected_source), indent=2))
    else:
        if args.expected_source:
            parser.error("--expected-source requires --verify-candidate")
        main()

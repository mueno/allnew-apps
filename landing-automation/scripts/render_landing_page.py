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
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "landing-apps.generated.json"
INDEX_PATH = ROOT / "index.html"
BASE_URL = "https://apps.allnew.work"
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
                        <img src="{card_image}" alt="{name}" loading="lazy">
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
    return [app for app in apps if app.get("status") == "released"]


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
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "JPY"},
            "author": {"@type": "Organization", "name": "AllNew LLC"},
        }
        if app.get("app_store_url"):
            item["installUrl"] = app["app_store_url"]
        items.append({"@type": "ListItem", "position": position, "item": item})

    payload = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "AllNew iOS Apps",
        "description": "健康管理・ペットケア・生産性向上の iOS アプリカタログ",
        "numberOfItems": len(apps),
        "itemListElement": items,
    }
    return json.dumps(payload, ensure_ascii=False, indent=4)


def replace_json_ld(page: str, json_ld: str) -> str:
    # スクリプトブロック単位で走査する。貪欲マッチで隣の JSON-LD
    # （Organization 等）を巻き込まないため、`</script>` を境界として
    # 各ブロックを個別に判定する。
    pattern = re.compile(
        r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S
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
        cards.append(
            CARD_TEMPLATE.format(
                support_path=html.escape(app.get("support_path") or f"{app['slug']}/?lang=ja", quote=True),
                card_image=html.escape(app.get("card_image_path") or app.get("icon_path") or "", quote=True),
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


def main() -> None:
    apps = load_released_apps()
    if not apps:
        raise SystemExit("render_landing_page: no released apps in generated data")

    page = INDEX_PATH.read_text(encoding="utf-8")
    page = replace_json_ld(page, build_json_ld(apps))
    for category in GRID_CATEGORIES:
        page = render_grid(page, category, apps)
        page = render_footer(page, category, apps)

    # 検証: 全 JSON-LD ブロックがパース可能で、ItemList が期待件数であること
    # （feedback portal / status board は静的 JSON-LD を DOMParser で読む前提）
    blocks = re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', page, re.S
    )
    item_lists = []
    for body in blocks:
        parsed = json.loads(body)  # どれか壊れていれば fail-closed
        if parsed.get("@type") == "ItemList":
            item_lists.append(parsed)
    if len(item_lists) != 1 or item_lists[0].get("numberOfItems") != len(apps):
        raise SystemExit("render_landing_page: JSON-LD validation failed")
    if page.count('class="work-card"') < len(apps):
        raise SystemExit("render_landing_page: card count mismatch")

    if INDEX_PATH.read_text(encoding="utf-8") != page:
        INDEX_PATH.write_text(page, encoding="utf-8")
        print(f"render_landing_page: updated index.html ({len(apps)} released apps)")
    else:
        print("render_landing_page: no changes")


if __name__ == "__main__":
    main()

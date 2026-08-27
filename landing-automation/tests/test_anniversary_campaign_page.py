from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CAMPAIGN_ROOT = ROOT / "anniversary-2026"
ELIGIBLE_IDS = {
    "6759169189",
    "6759076255",
    "6759076543",
    "6759076606",
    "6759076419",
    "6772019638",
    "6759076145",
    "6759076505",
    "6759076372",
    "6759076494",
    "6758825019",
    "6777605653",
    "6772019458",
}
SUBSCRIPTION_APP_IDS = {"6767980716", "6772018672", "6768502509"}


def load_apps() -> list[dict[str, object]]:
    return json.loads((CAMPAIGN_ROOT / "apps.json").read_text(encoding="utf-8"))


def test_campaign_contains_each_eligible_app_once() -> None:
    apps = load_apps()
    ids = [str(app["id"]) for app in apps]

    assert len(ids) == 13
    assert len(ids) == len(set(ids))
    assert set(ids) == ELIGIBLE_IDS
    assert set(ids).isdisjoint(SUBSCRIPTION_APP_IDS)


def test_localized_storefront_links_are_exact() -> None:
    for app in load_apps():
        app_id = str(app["id"])
        ja = app["ja"]
        en = app["en"]
        assert isinstance(ja, dict)
        assert isinstance(en, dict)
        assert f"/id{app_id}" in str(ja["url"])
        assert f"/id{app_id}" in str(en["url"])
        assert "https://apps.apple.com/jp/app/" in str(ja["url"])
        assert "https://apps.apple.com/us/app/" in str(en["url"])


def test_language_pages_link_to_campaign_assets_and_each_other() -> None:
    ja_html = (CAMPAIGN_ROOT / "index.html").read_text(encoding="utf-8")
    en_html = (CAMPAIGN_ROOT / "en" / "index.html").read_text(encoding="utf-8")

    assert '<html lang="ja">' in ja_html
    assert '<html lang="en">' in en_html
    assert "/anniversary-2026/campaign.js" in ja_html
    assert "/anniversary-2026/campaign.js" in en_html
    assert 'href="/anniversary-2026/en/"' in ja_html
    assert 'href="/anniversary-2026/"' in en_html


def test_lifetime_unlock_count_matches_campaign_evidence() -> None:
    assert sum(bool(app["lifetimeUnlockFree"]) for app in load_apps()) == 11


def test_every_campaign_icon_is_a_local_existing_asset() -> None:
    for app in load_apps():
        icon_path = str(app["icon"]).split("?", maxsplit=1)[0]
        assert icon_path.startswith("/")
        assert (ROOT / icon_path.removeprefix("/")).is_file()

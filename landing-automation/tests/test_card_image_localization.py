"""The English page must show English card images where the app has them.

Apps whose App Store listing has genuine English screenshots (medreminder,
hikae-cards) carry a `card_image_path_en`; apps that only have Japanese
screenshots (basalsnap, meishibridge) omit it and the runtime falls back to
the Japanese card image — the same behaviour as the App Store US storefront.
"""

from __future__ import annotations

import json
from pathlib import Path

import store_discovery as sd
import update_landing_data as uld

REPO_ROOT = Path(__file__).resolve().parents[2]
GENERATED = REPO_ROOT / "data" / "landing-apps.generated.json"


def _entries():
    data = json.loads(GENERATED.read_text(encoding="utf-8"))
    return {app["slug"]: app for app in data.get("apps", [])}


def pick_card_image(app: dict, lang: str) -> str:
    """Python mirror of the runtime pickCardImage(app) fallback chain."""
    if lang == "en":
        return (
            app.get("card_image_path_en")
            or app.get("promo_image_path_en")
            or app.get("card_image_path")
            or app.get("promo_image_path")
            or ""
        )
    return app.get("card_image_path") or app.get("promo_image_path") or ""


class TestGeneratedLocalization:
    def test_en_card_assets_exist_and_are_english_variants(self):
        entries = _entries()
        for slug in ("medreminder", "hikae-cards"):
            en = entries[slug].get("card_image_path_en")
            assert en, f"{slug} should carry an English card image"
            assert en.endswith("-en.jpg"), f"{slug} en image should be the -en variant"
            assert (REPO_ROOT / en).exists(), f"missing committed asset: {en}"

    def test_apps_without_english_screenshots_fall_back_to_ja(self):
        entries = _entries()
        for slug in ("basalsnap", "meishibridge"):
            assert not entries[slug].get("card_image_path_en"), (
                f"{slug} has no English App Store screenshot; must not fabricate one"
            )
            # EN render falls back to the JA card image (never empty, never icon)
            en_render = pick_card_image(entries[slug], "en")
            assert en_render == entries[slug]["card_image_path"]
            assert en_render and "app-icons/" not in en_render

    def test_en_and_ja_differ_where_localized(self):
        entries = _entries()
        for slug in ("medreminder", "hikae-cards"):
            assert pick_card_image(entries[slug], "en") != pick_card_image(entries[slug], "ja")

    def test_language_neutral_apps_share_one_image(self):
        entries = _entries()
        # weightsnap uses a language-neutral onboarding shot: same in both languages
        ws = entries["weightsnap"]
        assert not ws.get("card_image_path_en")
        assert pick_card_image(ws, "en") == pick_card_image(ws, "ja")


class TestPipelineCarriesEnFields:
    def test_default_output_entry_includes_en_fields(self):
        entry = uld.default_output_entry({
            "slug": "x",
            "card_image_path_en": "assets/asc-screenshots/x-en.jpg",
            "promo_image_path_en": "assets/asc-screenshots/x-en.jpg",
        })
        assert entry["card_image_path_en"] == "assets/asc-screenshots/x-en.jpg"
        assert entry["promo_image_path_en"] == "assets/asc-screenshots/x-en.jpg"

    def test_apply_catalog_defaults_flows_en_from_catalog(self):
        catalog_entry = {
            "slug": "x",
            "icon_path": "x-icon.png",
            "card_image_path": "assets/asc-screenshots/x.jpg",
            "card_image_path_en": "assets/asc-screenshots/x-en.jpg",
            "promo_image_path_en": "assets/asc-screenshots/x-en.jpg",
        }
        stale = {"slug": "x", "card_image_path_en": ""}  # generated lagged behind
        merged = uld.apply_catalog_defaults(stale, catalog_entry)
        assert merged["card_image_path_en"] == "assets/asc-screenshots/x-en.jpg"

    def test_find_store_screenshot_en_locale(self, tmp_path):
        d = tmp_path / "assets" / "asc-screenshots"
        d.mkdir(parents=True)
        (d / "x.jpg").write_bytes(b"x")
        (d / "x-en.jpg").write_bytes(b"x")
        assert sd.find_store_screenshot(tmp_path, "x") == "assets/asc-screenshots/x.jpg"
        assert sd.find_store_screenshot(tmp_path, "x", locale="en") == "assets/asc-screenshots/x-en.jpg"

    def test_find_store_screenshot_en_absent(self, tmp_path):
        d = tmp_path / "assets" / "asc-screenshots"
        d.mkdir(parents=True)
        (d / "x.jpg").write_bytes(b"x")
        assert sd.find_store_screenshot(tmp_path, "x", locale="en") == ""

"""Regression guard: a card's big image is a real app screen, never the icon.

The 2026-07-03 bug shipped four apps (basalsnap, meishibridge, medreminder,
hikae-cards) whose card image was the app icon, blown up to fill the card.
These tests fix the behaviour structurally so it cannot silently return.
"""

from __future__ import annotations

import json
from pathlib import Path

import store_discovery as sd
import update_landing_data as uld

REPO_ROOT = Path(__file__).resolve().parents[2]
GENERATED = REPO_ROOT / "data" / "landing-apps.generated.json"
CATALOG = REPO_ROOT / "landing-automation" / "config" / "app_catalog.json"


def _is_icon_like(path: str, slug: str, icon_path: str) -> bool:
    if not path:
        return False
    if path == icon_path:
        return True
    if "assets/app-icons/" in path:
        return True
    return path.rsplit("/", 1)[-1].startswith(f"{slug}-icon.")


class TestShippedDataHasNoIconCards:
    """The committed landing data must never use an icon as a card image."""

    def test_generated_card_images_are_not_icons(self):
        data = json.loads(GENERATED.read_text(encoding="utf-8"))
        offenders = [
            app["slug"]
            for app in data.get("apps", [])
            if _is_icon_like(
                str(app.get("card_image_path") or ""),
                str(app.get("slug") or ""),
                str(app.get("icon_path") or ""),
            )
        ]
        assert offenders == [], f"card image is the app icon for: {offenders}"

    def test_every_released_app_has_a_card_image(self):
        data = json.loads(GENERATED.read_text(encoding="utf-8"))
        missing = [
            app["slug"]
            for app in data.get("apps", [])
            if app.get("status") == "released"
            and not (app.get("card_image_path") or app.get("promo_image_path"))
        ]
        assert missing == [], f"released apps with no card/promo image: {missing}"


class TestResolveCardImageNeverIcon:
    def test_prefers_onboarding(self, tmp_path):
        (tmp_path / "assets" / "onboarding").mkdir(parents=True)
        (tmp_path / "assets" / "onboarding" / "foo-onboarding1.jpeg").write_bytes(b"x")
        assert sd.resolve_card_image(tmp_path, "foo") == "assets/onboarding/foo-onboarding1.jpeg"

    def test_falls_back_to_store_screenshot_not_icon(self, tmp_path):
        (tmp_path / "assets" / "asc-screenshots").mkdir(parents=True)
        (tmp_path / "assets" / "asc-screenshots" / "foo.jpg").write_bytes(b"x")
        # even if an icon exists, the card must be the screenshot
        (tmp_path / "foo-icon.png").write_bytes(b"x")
        assert sd.resolve_card_image(tmp_path, "foo") == "assets/asc-screenshots/foo.jpg"

    def test_empty_when_no_real_image(self, tmp_path):
        (tmp_path / "foo-icon.png").write_bytes(b"x")
        assert sd.resolve_card_image(tmp_path, "foo") == ""


class TestApplyCatalogDefaultsHealsIconCard:
    def test_icon_card_is_rewritten_to_store_screenshot(self):
        catalog_entry = {
            "slug": "foo",
            "icon_path": "foo-icon.png",
            "card_image_path": "assets/asc-screenshots/foo.jpg",
            "promo_image_path": "assets/asc-screenshots/foo.jpg",
            "promo_image_source": "asc_first_screenshot",
        }
        # simulate a stale generated entry that pinned the icon as the card
        stale = {"slug": "foo", "icon_path": "foo-icon.png", "card_image_path": "foo-icon.png"}
        merged = uld.apply_catalog_defaults(stale, catalog_entry)
        assert merged["card_image_path"] == "assets/asc-screenshots/foo.jpg"
        assert merged["promo_image_source"] == "asc_first_screenshot"

    def test_app_icons_path_is_detected_as_icon(self):
        assert uld.is_icon_like_card("assets/app-icons/foo-icon.jpg", {"slug": "foo"})

    def test_onboarding_card_is_not_icon(self):
        assert not uld.is_icon_like_card(
            "assets/onboarding/foo-onboarding1.jpeg", {"slug": "foo", "icon_path": "foo-icon.png"}
        )

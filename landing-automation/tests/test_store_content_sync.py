"""Tests for store_content_sync: ownership model and drift detection."""

from __future__ import annotations

import json

import store_content_sync as scs


def track(app_id, name, *, genre="Business", icon="https://is1-ssl.mzstatic.com/image/a.png", desc="First sentence. More."):
    return {
        "trackId": int(app_id),
        "trackName": name,
        "primaryGenreName": genre,
        "genres": [genre],
        "bundleId": f"jp.allnew.x{app_id}",
        "trackViewUrl": f"https://apps.apple.com/jp/app/x/id{app_id}?uo=4",
        "artworkUrl512": icon,
        "description": desc,
        "releaseDate": "2026-06-01T00:00:00Z",
    }


def lookup_for(*tracks):
    return {"jp": {str(t["trackId"]): t for t in tracks}, "us": {str(t["trackId"]): t for t in tracks}}


def observations_for(lookup):
    return {
        "schema_version": 1,
        "apps": {
            app_id: {
                "slug": "",
                "track_name": t["trackName"],
                "icon_url": t.get("artworkUrl512", ""),
            }
            for app_id, t in lookup["jp"].items()
        },
        "warnings": [],
        "updated_at": "2026-07-01T00:00:00+00:00",
    }


def machine_entry(app_id, slug, **overrides):
    entry = {
        "slug": slug,
        "name": "OldName",
        "name_ja": "旧名",
        "category": "productivity",
        "category_label": "Productivity",
        "description_ja": "旧説明。",
        "description_en": "Old description.",
        "icon_path": f"assets/app-icons/{slug}-icon.jpg",
        "card_image_path": f"assets/app-icons/{slug}-icon.jpg",
        "input_methods": ["voice_input"],
        "is_health_app": False,
        "support_path": f"{slug}/?lang=ja",
        "app_store_url": f"https://apps.apple.com/jp/app/x/id{app_id}",
        "asc_app_id": str(app_id),
        "sort_order": 120,
        "featured_priority": 999,
        "bootstrap_visible": False,
        "auto_onboarded": True,
        "slug_resolution": "derived",
    }
    entry.update(overrides)
    return entry


def curated_entry(app_id, slug):
    entry = machine_entry(app_id, slug)
    del entry["auto_onboarded"]
    del entry["slug_resolution"]
    return entry


class TestMachineOwnedRefresh:
    def test_store_rename_updates_entry(self, tmp_path, monkeypatch):
        monkeypatch.setattr(scs.sd, "resolve_icon_path", lambda *a, **k: "assets/app-icons/newapp-icon.jpg")
        lookup = lookup_for(track("200", "NewName 新名称", desc="新説明です。続き。"))
        catalog = {"apps": [machine_entry("200", "newapp")]}
        obs = observations_for(lookup)
        obs["apps"]["200"]["track_name"] = "OldName 旧名"

        changed, next_obs = scs.sync_content(tmp_path, catalog, lookup, obs)
        entry = catalog["apps"][0]
        assert changed is True
        assert entry["name"] == "NewName"
        assert entry["name_ja"] == "新名称"
        assert entry["description_ja"] == "新説明です。"
        # Human-enriched fields survive the refresh.
        assert entry["input_methods"] == ["voice_input"]
        assert entry["sort_order"] == 120
        assert next_obs["warnings"] == []

    def test_icon_change_redownloads_machine_icon(self, tmp_path, monkeypatch):
        calls = {}

        def fake_icon(root, slug, tr, *, force=False):
            calls["force"] = force
            return "assets/app-icons/newapp-icon.jpg"

        monkeypatch.setattr(scs.sd, "resolve_icon_path", fake_icon)
        lookup = lookup_for(track("200", "OldName 旧名", icon="https://is1-ssl.mzstatic.com/image/CHANGED.png"))
        catalog = {"apps": [machine_entry("200", "newapp")]}
        obs = observations_for(lookup)
        obs["apps"]["200"]["track_name"] = "OldName 旧名"
        obs["apps"]["200"]["icon_url"] = "https://is1-ssl.mzstatic.com/image/a.png"

        scs.sync_content(tmp_path, catalog, lookup, obs)
        assert calls.get("force") is True

    def test_root_convention_icon_never_overwritten(self, tmp_path, monkeypatch):
        def fail_icon(*a, **k):
            raise AssertionError("must not download over a curated root icon")

        monkeypatch.setattr(scs.sd, "resolve_icon_path", fail_icon)
        lookup = lookup_for(track("200", "OldName 旧名", icon="https://is1-ssl.mzstatic.com/image/CHANGED.png"))
        entry = machine_entry("200", "newapp", icon_path="newapp-icon.png")
        catalog = {"apps": [entry]}
        obs = observations_for(lookup)
        obs["apps"]["200"]["icon_url"] = "https://is1-ssl.mzstatic.com/image/a.png"

        scs.sync_content(tmp_path, catalog, lookup, obs)
        assert entry["icon_path"] == "newapp-icon.png"


class TestCuratedProtection:
    def test_curated_entry_untouched_on_rename(self, tmp_path):
        lookup = lookup_for(track("100", "Renamed App"))
        entry = curated_entry("100", "curated")
        before = json.dumps(entry, sort_keys=True)
        catalog = {"apps": [entry]}
        obs = observations_for(lookup)
        obs["apps"]["100"]["track_name"] = "Original App"

        changed, next_obs = scs.sync_content(tmp_path, catalog, lookup, obs)
        assert changed is False
        assert json.dumps(entry, sort_keys=True) == before
        kinds = [w["kind"] for w in next_obs["warnings"]]
        assert kinds == ["store_rename"]

    def test_curated_icon_change_warns_only(self, tmp_path):
        lookup = lookup_for(track("100", "Same Name", icon="https://is1-ssl.mzstatic.com/image/NEW.png"))
        entry = curated_entry("100", "curated")
        catalog = {"apps": [entry]}
        obs = observations_for(lookup)
        obs["apps"]["100"]["track_name"] = "Same Name"
        obs["apps"]["100"]["icon_url"] = "https://is1-ssl.mzstatic.com/image/OLD.png"

        changed, next_obs = scs.sync_content(tmp_path, catalog, lookup, obs)
        assert changed is False
        assert [w["kind"] for w in next_obs["warnings"]] == ["icon_changed"]

    def test_baseline_run_produces_no_warnings(self, tmp_path):
        lookup = lookup_for(track("100", "Any Name"))
        catalog = {"apps": [curated_entry("100", "curated")]}
        changed, next_obs = scs.sync_content(
            tmp_path, catalog, lookup, {"schema_version": 1, "apps": {}, "warnings": []}
        )
        assert changed is False
        assert next_obs["warnings"] == []
        assert next_obs["apps"]["100"]["track_name"] == "Any Name"

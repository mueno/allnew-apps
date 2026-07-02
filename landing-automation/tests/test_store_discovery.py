"""Tests for store_discovery: slug resolution, onboarding, catalog sync."""

from __future__ import annotations

import json

import pytest

import store_discovery as sd


def make_repo(tmp_path, dirs=(), bodies=None):
    bodies = bodies or {}
    for name in dirs:
        directory = tmp_path / name
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "index.html").write_text(
            bodies.get(name, f"<title>{name.title()} Support</title>"), encoding="utf-8"
        )
    return tmp_path


def track(app_id, name, *, genre="Health & Fitness", bundle="jp.allnew.x", url=None, desc="", release="2026-06-01T00:00:00Z"):
    return {
        "trackId": int(app_id),
        "trackName": name,
        "primaryGenreName": genre,
        "genres": [genre],
        "bundleId": bundle,
        "trackViewUrl": url or f"https://apps.apple.com/jp/app/x/id{app_id}?uo=4",
        "description": desc,
        "releaseDate": release,
    }


class TestDeriveLatinSlug:
    @pytest.mark.parametrize(
        ("name", "expected"),
        [
            ("MeishiBridge Card Scanner", "meishibridge"),
            ("BasalSnap", "basalsnap"),
            ("BOTTO - 没頭タイマー", "botto"),
            ("基礎体温記録", ""),
            ("AI服薬通知 - 処方箋リマインダー", ""),  # latin run too short
        ],
    )
    def test_cases(self, name, expected):
        assert sd.derive_latin_slug(name) == expected


class TestResolveSlug:
    def test_override_wins(self, tmp_path):
        root = make_repo(tmp_path, ["somedir"])
        slug, method = sd.resolve_slug(
            "111", track("111", "BasalSnap"), {}, {"111": "somedir"}, root
        )
        assert (slug, method) == ("somedir", "override")

    def test_derived_dir(self, tmp_path):
        root = make_repo(tmp_path, ["meishibridge"])
        slug, method = sd.resolve_slug(
            "222", track("222", "MeishiBridge 名刺登録"), track("222", "MeishiBridge Card Scanner"), {}, root
        )
        assert (slug, method) == ("meishibridge", "derived_dir")

    def test_support_page_match_for_ja_only_name(self, tmp_path):
        root = make_repo(
            tmp_path,
            ["basalsnap", "other"],
            bodies={"basalsnap": "<title>BasalSnap Support</title><h1>基礎体温記録</h1>"},
        )
        slug, method = sd.resolve_slug(
            "333", track("333", "基礎体温記録"), {}, {}, root
        )
        assert (slug, method) == ("basalsnap", "support_page_match")

    def test_ambiguous_body_match_is_rejected(self, tmp_path):
        root = make_repo(
            tmp_path,
            ["appa", "appb"],
            bodies={"appa": "共通の名前", "appb": "共通の名前"},
        )
        slug, method = sd.resolve_slug("444", track("444", "共通の名前"), {}, {}, root)
        assert (slug, method) == ("app-444", "fallback")

    def test_derived_without_dir(self, tmp_path):
        slug, method = sd.resolve_slug(
            "555", track("555", "NewThing 新作"), {}, {}, tmp_path
        )
        assert (slug, method) == ("newthing", "derived")

    def test_fallback(self, tmp_path):
        slug, method = sd.resolve_slug("666", track("666", "全部日本語"), {}, {}, tmp_path)
        assert (slug, method) == ("app-666", "fallback")


class TestNamesAndMetadata:
    def test_split_names_latin_prefix(self):
        name, name_ja = sd.split_names(track("1", "MeishiBridge 名刺登録"), "MeishiBridge")
        assert name == "MeishiBridge"
        assert name_ja == "名刺登録"

    def test_split_names_ja_only_uses_product_name(self):
        name, name_ja = sd.split_names(track("1", "基礎体温記録"), "BasalSnap")
        assert name == "BasalSnap"
        assert name_ja == "基礎体温記録"

    def test_genre_to_category(self):
        assert sd.genre_to_category(track("1", "x", genre="Health & Fitness")) == "health"
        assert sd.genre_to_category(track("1", "x", genre="Medical")) == "health"
        assert sd.genre_to_category(track("1", "x", genre="Business")) == "productivity"

    def test_first_sentence_ja(self):
        assert sd.first_sentence("一文目です。二文目です。") == "一文目です。"

    def test_first_sentence_long_text_cuts_at_word(self):
        text = "word " * 60
        result = sd.first_sentence(text, limit=50)
        assert result.endswith("…")
        assert len(result) <= 51
        assert not result[:-1].endswith(" ")


class TestSyncCatalog:
    def lookup(self):
        return {
            "jp": {
                "100": track("100", "Known App", bundle="jp.allnew.known"),
                "200": track("200", "FreshApp 新登場", genre="Business", bundle="jp.allnew.reserve009"),
            },
            "us": {
                "100": track("100", "Known App"),
                "200": track("200", "FreshApp organizer", genre="Business"),
            },
        }

    def catalog(self):
        return {
            "schema_version": 1,
            "artist_id": "999",
            "slug_overrides": {},
            "apps": [{"slug": "known-app", "asc_app_id": "100", "sort_order": 10}],
        }

    def test_onboards_only_unknown(self, tmp_path):
        root = make_repo(tmp_path, ["freshapp"])
        catalog = self.catalog()
        changed, onboarded = sd.sync_catalog(root, catalog, self.lookup())
        assert changed is True
        assert [entry["slug"] for entry in onboarded] == ["freshapp"]
        entry = onboarded[0]
        assert entry["asc_app_id"] == "200"
        assert entry["auto_onboarded"] is True
        assert entry["category"] == "productivity"
        assert entry["support_path"] == "freshapp/?lang=ja"
        assert entry["sort_order"] == 20
        assert entry["app_store_url"].startswith("https://apps.apple.com/")
        assert "?" not in entry["app_store_url"]

    def test_existing_entries_never_mutated(self, tmp_path):
        root = make_repo(tmp_path, ["freshapp"])
        catalog = self.catalog()
        before = json.dumps(catalog["apps"][0], sort_keys=True)
        sd.sync_catalog(root, catalog, self.lookup())
        assert json.dumps(catalog["apps"][0], sort_keys=True) == before

    def test_idempotent(self, tmp_path):
        root = make_repo(tmp_path, ["freshapp"])
        catalog = self.catalog()
        sd.sync_catalog(root, catalog, self.lookup())
        changed, onboarded = sd.sync_catalog(root, catalog, self.lookup())
        assert changed is False
        assert onboarded == []

    def test_slug_collision_skipped(self, tmp_path):
        root = make_repo(tmp_path, [])
        catalog = self.catalog()
        catalog["apps"].append({"slug": "freshapp", "asc_app_id": "", "sort_order": 20})
        changed, onboarded = sd.sync_catalog(root, catalog, self.lookup())
        assert changed is False
        assert onboarded == []

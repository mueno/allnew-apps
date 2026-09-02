"""Tests for landing_live_verify pure helpers (no network)."""

from __future__ import annotations

import json
from types import SimpleNamespace

import landing_live_verify as lv
import store_discovery as sd


def generated(*slugs, status="released"):
    return {
        "schema_version": 1,
        "apps": [
            {
                "slug": slug,
                "asc_app_id": str(1000 + i),
                "status": status,
                "app_store_url": f"https://apps.apple.com/jp/app/x/id{1000 + i}",
            }
            for i, slug in enumerate(slugs)
        ],
    }


def html_for(*slugs):
    cards = "".join(f'<a class="work-card" href="{slug}/?lang=ja">x</a>' for slug in slugs)
    item_list = json.dumps({"@type": "ItemList", "numberOfItems": len(slugs)})
    return f'<html><script type="application/ld+json">{item_list}</script>{cards}</html>'


class TestJsonComparison:
    def test_identical_json_matches(self):
        assert lv.live_json_matches_repo(generated("a", "b"), generated("a", "b"))

    def test_key_order_is_irrelevant(self):
        live = json.loads(json.dumps(generated("a"), sort_keys=True))
        assert lv.live_json_matches_repo(live, generated("a"))

    def test_content_difference_detected(self):
        assert not lv.live_json_matches_repo(generated("a"), generated("a", "b"))


class TestHtmlChecks:
    def test_all_cards_present(self):
        assert lv.html_missing_slugs(html_for("a", "b"), ["a", "b"]) == []

    def test_missing_card_detected(self):
        assert lv.html_missing_slugs(html_for("a"), ["a", "b"]) == ["b"]

    def test_hidden_non_card_link_does_not_satisfy_readback(self):
        html = '<html><a href="secret-app/?lang=ja" hidden>not a card</a></html>'
        assert lv.html_missing_slugs(html, ["secret-app"]) == ["secret-app"]

    def test_itemlist_count_parsed(self):
        assert lv.html_itemlist_count(html_for("a", "b", "c")) == 3

    def test_itemlist_absent_returns_minus_one(self):
        assert lv.html_itemlist_count("<html></html>") == -1


class TestVerifyOnce:
    def test_pass_when_all_sources_agree(self, monkeypatch):
        repo = generated("a", "b")
        pages = {
            "https://x.test/data/landing-apps.generated.json": json.dumps(repo),
            "https://x.test/": html_for("a", "b"),
        }
        monkeypatch.setattr(lv, "fetch_text", lambda url: pages[url])
        lookup = {
            "jp": {"1000": {"trackName": "A"}, "1001": {"trackName": "B"}},
            "us": {},
        }
        catalog = {"apps": [{"slug": "a", "asc_app_id": "1000"}, {"slug": "b", "asc_app_id": "1001"}]}
        assert lv.verify_once("https://x.test", repo, lookup, catalog, {}) == []

    def test_live_missing_public_app_is_reported(self, monkeypatch):
        live = generated("a")
        pages = {
            "https://x.test/data/landing-apps.generated.json": json.dumps(live),
            "https://x.test/": html_for("a"),
        }
        monkeypatch.setattr(lv, "fetch_text", lambda url: pages[url])
        lookup = {
            "jp": {"1000": {"trackName": "A"}, "2000": {"trackName": "Hidden"}},
            "us": {},
        }
        catalog = {"apps": [{"slug": "a", "asc_app_id": "1000"}]}
        problems = lv.verify_once("https://x.test", live, lookup, catalog, {})
        assert any("2000" in p for p in problems)

    def test_repo_live_divergence_is_reported(self, monkeypatch):
        repo = generated("a", "b")
        live = generated("a")
        pages = {
            "https://x.test/data/landing-apps.generated.json": json.dumps(live),
            "https://x.test/": html_for("a"),
        }
        monkeypatch.setattr(lv, "fetch_text", lambda url: pages[url])
        lookup = {"jp": {"1000": {"trackName": "A"}}, "us": {}}
        catalog = {"apps": [{"slug": "a", "asc_app_id": "1000"}]}
        problems = lv.verify_once("https://x.test", repo, lookup, catalog, {})
        assert any("differs from the repo file" in p for p in problems)

    def test_html_card_gap_is_reported(self, monkeypatch):
        live = generated("a", "b")
        pages = {
            "https://x.test/data/landing-apps.generated.json": json.dumps(live),
            "https://x.test/": html_for("a"),
        }
        monkeypatch.setattr(lv, "fetch_text", lambda url: pages[url])
        lookup = {"jp": {"1000": {"trackName": "A"}, "1001": {"trackName": "B"}}, "us": {}}
        catalog = {"apps": [{"slug": "a", "asc_app_id": "1000"}, {"slug": "b", "asc_app_id": "1001"}]}
        problems = lv.verify_once("https://x.test", live, lookup, catalog, {})
        assert any("card link missing for b" in p for p in problems)
        assert any("ItemList count" in p for p in problems)


def test_live_readback_failure_cannot_be_downgraded_by_breaker(monkeypatch, tmp_path):
    catalog = tmp_path / "catalog.json"
    output = tmp_path / "output.json"
    exclusions = tmp_path / "exclusions.json"
    lookup = tmp_path / "lookup.json"
    catalog.write_text(json.dumps({"artist_id": "999", "apps": [{"slug": "a", "asc_app_id": "1000"}]}))
    output.write_text(json.dumps(generated("a")))
    exclusions.write_text(json.dumps({"exclusions": []}))
    lookup.write_text(
        json.dumps(sd.build_lookup_cache({"jp": {"1000": {"trackName": "A"}}, "us": {}}))
    )
    monkeypatch.setattr(
        lv,
        "parse_args",
        lambda: SimpleNamespace(
            base_url="https://x.test",
            output=output,
            catalog=catalog,
            exclusions=exclusions,
            lookup_file=lookup,
            allow_lookup_fixture=True,
            retries=1,
            interval=0.0,
        ),
    )
    monkeypatch.setattr(lv, "verify_once", lambda *_args, **_kwargs: ["production drift"])

    assert lv.main() == 1

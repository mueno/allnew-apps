"""Published lookup must reach the rendered page, including rename and price."""
import json

import pytest
import render_landing_page as render
import store_content_sync as content
import update_landing_data as update


def test_store_rename_survives_stale_support_title_and_generated_data(tmp_path):
    page = tmp_path / "oldslug" / "index.html"
    page.parent.mkdir()
    page.write_text("<title>OldName Support</title>")
    catalog = {"slug": "oldslug", "asc_app_id": "123", "auto_onboarded": True,
               "name": "OldName", "name_ja": "旧名", "description_ja": "旧説明。",
               "card_image_path": "screen.png", "icon_path": "icon.png"}
    track = {"trackId": 123, "trackName": "わん録", "description": "新しい説明です。",
             "version": "1.0.1", "price": 500, "currency": "JPY"}
    old = update.default_output_entry(catalog)
    old["app_store_version"] = "0.9-review"
    content.refresh_machine_owned_entry(catalog, "123", {"jp": {"123": track}}, tmp_path, False)
    entry = update.build_entry_from_app_store(old, catalog, track, "jp")
    assert entry["name"] == "わん録"
    assert entry["description_ja"] == "新しい説明です。"
    assert entry["app_store_version"] == "1.0.1"
    item = json.loads(render.build_json_ld([entry]))["itemListElement"][0]["item"]
    assert item["offers"] == {"@type": "Offer", "price": "500", "priceCurrency": "JPY"}


@pytest.mark.parametrize("price,currency", [(None, None), (-1, "JPY"), (True, "JPY"),
    (float("nan"), "JPY"), (float("inf"), "JPY"), (0, ""), (0, "jpy")])
def test_unknown_or_invalid_price_never_becomes_free(price, currency):
    catalog = {"slug": "test", "name": "Test"}
    old = {"app_store_price": 500, "app_store_currency": "JPY"}
    entry = update.build_entry_from_app_store(old, catalog, {"price": price, "currency": currency}, "jp")
    assert "app_store_price" not in entry
    item = json.loads(render.build_json_ld([entry]))["itemListElement"][0]["item"]
    assert "offers" not in item


def test_confirmed_zero_download_price_is_preserved():
    entry = update.build_entry_from_app_store(None, {"slug": "free", "name": "Free"},
                                               {"price": 0, "currency": "JPY"}, "jp")
    item = json.loads(render.build_json_ld([entry]))["itemListElement"][0]["item"]
    assert item["offers"]["price"] == "0"


def test_corrected_input_methods_replace_old_camera_claim():
    entry = update.build_entry_from_app_store(
        {"input_methods": ["camera_ocr", "voice_input"]},
        {"slug": "oxisnap", "input_methods": ["voice_input"]}, {}, "jp")
    assert entry["input_methods"] == ["voice_input"]
    assert "Camera" not in entry["input_methods_label"]

"""JSON-LD strings must stay data through HTML parsing and JSON decoding."""
import copy
from html.parser import HTMLParser
import json

import pytest
import render_landing_page as render
import store_content_sync as content
import update_landing_data as update


APP = {
    "slug": "synthetic-app", "asc_app_id": "123", "status": "released",
    "category": "productivity", "name": "日本語 🌸 & App",
    "name_ja": "記録アプリ", "description_ja": "毎日の記録。",
    "icon_path": "icon.png", "card_image_path": "screen.png",
    "app_store_url": "https://apps.apple.com/app/id123?a=1&b=2",
    "app_store_price": 500, "app_store_currency": "JPY",
}
PAYLOADS = (
    "</script><script id=synthetic-probe>0</script>",
    "</ScRiPt><ScRiPt id=synthetic-probe>0</ScRiPt>",
    "</script ><img id=synthetic-probe src=x>",
    "</SCRIPT/><svg id=synthetic-probe>",
    "<!--<script>",
)


class Document(HTMLParser):
    """Inspect actual script data rather than the renderer's validation regex."""
    def __init__(self, page):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.scripts = []
        self.active_script = None
        self.feed(page)
        self.close()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if tag == "script":
            self.scripts.append({"attrs": attrs, "text": ""})
            self.active_script = self.scripts[-1]

    def handle_endtag(self, tag):
        if tag == "script":
            self.active_script = None

    def handle_data(self, data):
        if self.active_script is not None:
            self.active_script["text"] += data

    def json_ld(self):
        return [json.loads(script["text"]) for script in self.scripts
                if script["attrs"].get("type") == "application/ld+json"]


def item_list(document):
    return next(block for block in document.json_ld() if block["@type"] == "ItemList")


@pytest.mark.parametrize("payload", PAYLOADS)
@pytest.mark.parametrize("field,key", [
    ("name", "name"), ("name_ja", "alternateName"),
    ("description_ja", "description"), ("slug", "url"),
    ("icon_path", "image"), ("app_store_url", "installUrl"),
])
def test_every_json_ld_string_stays_inside_one_script(field, key, payload):
    app = {**APP, field: payload}
    encoded = render.build_json_ld([app])
    # Also excludes comment/double-escaped script states, which HTMLParser
    # does not fully implement. JSON escapes must not become HTML entities.
    assert "<" not in encoded
    document = Document('<script type="application/ld+json">' + encoded
                        + '</script><p id="after-jsonld">after</p>')
    assert [tag for tag, _attrs in document.tags] == ["script", "p"]
    value = item_list(document)["itemListElement"][0]["item"][key]
    expected = f"{render.BASE_URL}/{payload}/" if field == "slug" else (
        f"{render.BASE_URL}/{payload}" if field == "icon_path" else payload)
    assert value == expected
    assert app[field] == payload


@pytest.mark.parametrize("payload", PAYLOADS)
def test_complete_render_preserves_cards_adjacent_schema_and_idempotence(payload):
    app = {**APP, "description_ja": payload}
    template = render.INDEX_PATH.read_text(encoding="utf-8")
    before = Document(template)
    page = render.render_page(template, [app], runtime=b"synthetic-runtime")
    after = Document(page)
    assert len(after.scripts) == len(before.scripts)
    assert not any(attrs.get("id") == "synthetic-probe" for _tag, attrs in after.tags)
    assert [b for b in after.json_ld() if b["@type"] != "ItemList"] == [
        b for b in before.json_ld() if b["@type"] != "ItemList"]
    assert item_list(after)["itemListElement"][0]["item"]["description"] == payload
    assert sum(attrs.get("class") == "work-card" for _tag, attrs in after.tags) == 1
    assert render.render_page(page, [app], runtime=b"synthetic-runtime") == page


def test_json_values_unicode_and_schema_are_lossless():
    text = '日本語 🌸 <>& &lt; &#x3c; " \\ literal \\u003c\n\t\u2028\u2029'
    app = {**APP, "name": text, "name_ja": text, "description_ja": text}
    source = copy.deepcopy(app)
    encoded = render.build_json_ld([app])
    assert "日本語 🌸" in encoded
    assert not any(character in encoded for character in "<>&")
    block = item_list(Document('<script type="application/ld+json">' + encoded + '</script>'))
    assert block["@context"] == "https://schema.org"
    assert block["numberOfItems"] == 1
    assert block["itemListElement"] == [{
        "@type": "ListItem", "position": 1,
        "item": {"@type": "MobileApplication", "name": text, "alternateName": text,
                 "description": text, "url": f"{render.BASE_URL}/synthetic-app/",
                 "image": f"{render.BASE_URL}/icon.png",
                 "applicationCategory": "UtilitiesApplication", "operatingSystem": "iOS",
                 "author": {"@type": "Organization", "name": "AllNew LLC"},
                 "installUrl": app["app_store_url"],
                 "offers": {"@type": "Offer", "price": "500", "priceCurrency": "JPY"}},
    }]
    assert app == source


@pytest.mark.parametrize("source", ["event", "store"])
def test_metadata_sources_share_the_safe_output_boundary(source, tmp_path):
    payload = "</ScRiPt><img id=synthetic-probe src=x>"
    catalog = {**APP, "auto_onboarded": True}
    if source == "event":
        entry = update.build_entry_from_event(None, catalog,
            {"status": "READY_FOR_SALE", "name": payload, "name_ja": payload,
             "description_ja": payload}, {})
    else:
        track = {"trackId": 123, "trackName": payload, "description": payload,
                 "primaryGenreName": "Productivity"}
        content.refresh_machine_owned_entry(catalog, "123", {"jp": {"123": track}},
                                            tmp_path, False)
        entry = update.build_entry_from_app_store(None, catalog, track, "jp")
    for field in ("name", "name_ja", "description_ja"):
        assert entry[field] == payload
    page = render.render_page(render.INDEX_PATH.read_text(encoding="utf-8"), [entry])
    document = Document(page)
    assert not any(attrs.get("id") == "synthetic-probe" for _tag, attrs in document.tags)
    item = item_list(document)["itemListElement"][0]["item"]
    assert item["name"] == item["alternateName"] == item["description"] == payload

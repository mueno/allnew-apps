"""Regression tests for safe JSON-LD rendering in render_landing_page.

Guards the script-context output-encoding + case-insensitive block matching
that stop an App Store description from breaking out of the
``<script type="application/ld+json">`` element. The source of these fields is
AllNew's own App Store metadata (self-authored), so this is defense-in-depth,
but the encoding must be correct regardless of who writes the value.
"""

from __future__ import annotations

import json
import re

import render_landing_page as rlp


def _app(**overrides):
    app = {
        "slug": "probe",
        "name": "Probe",
        "name_ja": "プローブ",
        "description_ja": "safe description",
        "category": "productivity",
        "icon_path": "probe-icon.png",
        "app_store_url": "https://apps.apple.com/jp/app/x/id123",
    }
    app.update(overrides)
    return app


def test_json_ld_escapes_script_breakout_chars():
    """A mixed-case </ScRiPt> in a description cannot terminate the block."""
    payload = "</ScRiPt><script>alert(1)</sCrIpT> & <img src=x onerror=alert(1)>"
    json_ld = rlp.build_json_ld([_app(description_ja=payload)])

    # No raw script-context-significant characters survive in the block.
    assert "<" not in json_ld
    assert ">" not in json_ld
    assert "&" not in json_ld
    # No case-insensitive </script terminator can appear anywhere.
    assert re.search(r"</script", json_ld, re.I) is None
    # Round-trips: the escaped value parses back to the original text.
    parsed = json.loads(json_ld)
    assert parsed["itemListElement"][0]["item"]["description"] == payload


def test_all_json_ld_string_fields_are_escaped():
    """Escaping covers name/alternateName, not just description."""
    json_ld = rlp.build_json_ld([_app(name="A<b>&", name_ja="日本<>")])
    assert "<" not in json_ld and ">" not in json_ld and "&" not in json_ld
    item = json.loads(json_ld)["itemListElement"][0]["item"]
    assert item["name"] == "A<b>&"
    assert item["alternateName"] == "日本<>"


def test_escaping_neutralizes_mixed_case_close_tag_in_data():
    """A mixed-case </ScRiPt> inside a *description* is neutralized by the
    output escaping (the real control), so replace_json_ld still produces one
    clean, parseable block. (This asserts the escaping layer, not re.I —
    test_replace_json_ld_matches_mixed_case_boundary covers re.I.)"""
    page = (
        "<html><head>"
        '<script type="application/ld+json">'
        '{"@type":"ItemList","numberOfItems":0,"itemListElement":[]}'
        "</script>"
        "</head><body></body></html>"
    )
    json_ld = rlp.build_json_ld([_app(description_ja="</ScRiPt> boom")])
    replaced = rlp.replace_json_ld(page, json_ld)

    blocks = re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', replaced, re.I | re.S
    )
    assert len(blocks) == 1
    parsed = json.loads(blocks[0])
    assert parsed["@type"] == "ItemList"
    assert parsed["numberOfItems"] == 1


def test_replace_json_ld_matches_mixed_case_boundary():
    """replace_json_ld must recognize the existing ItemList block even when its
    closing tag is a mixed-case </ScRiPt> — this actually exercises the re.I
    flag on the production block-matching regex. With re.S only (re.I removed),
    the boundary is not matched and replace_json_ld raises 'block not found',
    so this test fails if that defense-in-depth flag is ever reverted."""
    page = (
        "<html><head>"
        '<script type="application/ld+json">'
        '{"@type":"ItemList","numberOfItems":0,"itemListElement":[]}'
        "</ScRiPt>"  # mixed-case boundary: re.S-only would not match this block
        "</head><body></body></html>"
    )
    json_ld = rlp.build_json_ld([_app(description_ja="safe")])

    replaced = rlp.replace_json_ld(page, json_ld)  # raises if re.I is missing

    blocks = re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', replaced, re.I | re.S
    )
    assert len(blocks) == 1
    assert json.loads(blocks[0])["numberOfItems"] == 1


def test_benign_content_still_renders_valid_json_ld():
    """Ordinary descriptions round-trip unchanged (no over-escaping breakage)."""
    json_ld = rlp.build_json_ld([_app(description_ja="血圧を記録")])
    parsed = json.loads(json_ld)
    assert parsed["numberOfItems"] == 1
    assert parsed["itemListElement"][0]["item"]["description"] == "血圧を記録"

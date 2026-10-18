"""Public output must not contain internal drafts, and the sitemap stays honest."""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from public_surface import (
    NOINDEX_HEADER_SOURCES,
    PUBLIC_LANDING_RUNTIME,
    PUBLIC_PATHS,
    REMOVED_PUBLIC_PATHS,
    is_blocked_path,
    is_excluded_relative,
)

SECRET_PATTERNS = (
    ("private_key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("aws_access_key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("github_token", re.compile(r"ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}")),
    ("slack_token", re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}")),
    ("stripe_live_key", re.compile(r"sk_live_[A-Za-z0-9]{8,}")),
    ("google_api_key", re.compile(r"AIza[0-9A-Za-z\-_]{20,}")),
)


def test_block_list_splits_internal_docs_from_public_pages() -> None:
    for path in REMOVED_PUBLIC_PATHS:
        assert is_blocked_path(path), path
    for path in PUBLIC_PATHS:
        assert not is_blocked_path(path), path
    assert not is_blocked_path("/" + PUBLIC_LANDING_RUNTIME)
    assert not is_blocked_path("/feedback/cookie-policy.html")
    assert not is_blocked_path("/feedback/status-board.js")
    assert is_blocked_path("/feedback/notes.md")
    assert is_blocked_path("/Notes.MD")


def test_source_markdown_is_excluded_from_the_public_tree() -> None:
    assert is_excluded_relative(Path("internal/feedback/deployment-security.md"))
    assert is_excluded_relative(Path("feedback/deployment-security.md"))
    assert is_excluded_relative(Path("TECHBLOG_DRAFT_ZENN.md"))
    assert is_excluded_relative(Path("landing-automation/README.md"))
    assert is_excluded_relative(Path("test-results/.last-run.json"))
    assert is_excluded_relative(Path(".planning/domain-audit-2026-06-13.md"))
    assert not is_excluded_relative(Path("feedback/index.html"))
    assert not is_excluded_relative(Path("llms.txt"))
    assert not is_excluded_relative(Path(PUBLIC_LANDING_RUNTIME))
    assert (ROOT / "internal/feedback/deployment-security.md").is_file()
    assert not (ROOT / "feedback/deployment-security.md").exists()
    assert not (ROOT / "TECHBLOG_DRAFT_ZENN.md").exists()


def test_vercel_headers_noindex_without_legacy_routes() -> None:
    config = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
    assert "routes" not in config
    assert config["outputDirectory"] == "dist"
    assert "build_public_site.py" in config["buildCommand"]
    noindex_sources = []
    for rule in config["headers"]:
        source = rule["source"]
        # path-to-regexp only: reject inline flags, lookahead, and lookbehind
        assert "(?" not in source, source
        robots = next(
            (item["value"] for item in rule["headers"] if item["key"] == "X-Robots-Tag"),
            "",
        )
        if robots:
            assert "noindex" in robots
            noindex_sources.append(source)
    assert noindex_sources == list(NOINDEX_HEADER_SOURCES)
    joined = json.dumps(config["headers"])
    assert "Strict-Transport-Security" in joined


SUPPORTED_REDIRECT_STATUSES = {"200", "301", "302", "303", "307", "308"}


def test_redirects_has_only_cloudflare_supported_rules() -> None:
    """Every _redirects rule must be `source destination status`.

    Cloudflare Pages treats a bare status such as `/internal/* 404` as a rewrite
    to a destination named "404" (default status 302) and documents non-redirect
    rewrite statuses as unsupported, so those lines never blocked anything. The
    real 404s now come from functions/_middleware.js; this file keeps only
    genuine redirects.
    """
    redirects = (ROOT / "_redirects").read_text(encoding="utf-8")
    for raw in redirects.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        fields = line.split()
        assert len(fields) == 3, f"not `source destination status`: {raw!r}"
        _source, destination, status = fields
        assert status in SUPPORTED_REDIRECT_STATUSES, f"unsupported status: {raw!r}"
        # A bare-status block rule has a numeric "destination"; reject it.
        assert not destination.isdigit(), f"bare-status rule: {raw!r}"


def test_cloudflare_middleware_covers_internal_paths() -> None:
    """The Pages Function is the Cloudflare-side block mechanism."""
    middleware = (ROOT / "functions" / "_middleware.js").read_text(encoding="utf-8")
    assert "export function isBlockedPath" in middleware
    assert "export async function onRequest" in middleware
    assert "X-Robots-Tag" in middleware and "noindex" in middleware
    # The one public landing-automation asset stays allowlisted.
    assert "/landing-automation/runtime/landing-runtime.js" in middleware
    for token in ("/internal", "/test-results", "/.planning", "/scripts", ".md", ".php"):
        assert token in middleware, token


def test_headers_and_robots_still_cover_internal_paths() -> None:
    headers = (ROOT / "_headers").read_text(encoding="utf-8")
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    assert "Strict-Transport-Security:" in headers
    assert "X-Robots-Tag: noindex, nofollow" in headers
    for group in ("User-agent: *", "User-agent: Googlebot", "User-agent: Bingbot"):
        section = robots.split(group, 1)[1].split("User-agent:", 1)[0]
        assert "Disallow: /*.md$" in section
        assert "Disallow: /internal/" in section
        assert "Disallow: /feedback/*.md" in section


def _robots_and_canonical(html: str) -> tuple[str, str]:
    robots = re.search(
        r'<meta[^>]*name=["\']robots["\'][^>]*content=["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    if not robots:
        robots = re.search(
            r'<meta[^>]*content=["\']([^"\']+)["\'][^>]*name=["\']robots["\']',
            html,
            re.IGNORECASE,
        )
    canonical = re.search(
        r'<link[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']',
        html,
        re.IGNORECASE,
    )
    return (
        robots.group(1) if robots else "",
        canonical.group(1) if canonical else "",
    )


def _page_file_for_loc(loc: str) -> Path:
    path = loc.removeprefix("https://apps.allnew.work")
    if path in ("", "/"):
        return ROOT / "index.html"
    relative = path.strip("/")
    index = ROOT / relative / "index.html"
    if index.is_file():
        return index
    direct = ROOT / relative
    if direct.is_file():
        return direct
    raise AssertionError(f"sitemap loc has no file: {loc}")


def test_sitemap_lists_only_indexable_apps_pages_and_no_internal_docs() -> None:
    tree = ET.parse(ROOT / "sitemap.xml")
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [(node.text or "").strip() for node in tree.findall("sm:url/sm:loc", ns)]
    assert locs
    assert "https://apps.allnew.work/anniversary-2026/" in locs
    assert "https://apps.allnew.work/anniversary-2026/en/" in locs
    assert "https://apps.allnew.work/feedback/" in locs
    assert "https://apps.allnew.work/babyvox/" in locs
    for loc in locs:
        assert ".md" not in loc
        assert "/internal" not in loc
        assert loc.startswith("https://apps.allnew.work/")
        page = _page_file_for_loc(loc)
        robots, canonical = _robots_and_canonical(page.read_text(encoding="utf-8"))
        assert "noindex" not in robots.lower(), loc
        assert canonical == loc, (loc, canonical)
    assert "https://apps.allnew.work/coughwav/" not in locs
    assert "https://apps.allnew.work/weightsnap/" not in locs


def test_dist_has_no_secret_shaped_strings(tmp_path: Path) -> None:
    from public_surface import build_public_site

    dest = tmp_path / "dist"
    build_public_site(dest=dest)
    text_suffixes = {".html", ".js", ".json", ".txt", ".xml", ".css", ".svg"}
    findings = []
    for path in dest.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in text_suffixes:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for name, pattern in SECRET_PATTERNS:
            if pattern.search(text):
                findings.append(f"{path.relative_to(dest)}:{name}")
    assert findings == []
    for rel in (
        "feedback/deployment-security.md",
        "internal/TECHBLOG_DRAFT_ZENN.md",
        "test-results/.last-run.json",
        "TECHBLOG_DRAFT_ZENN.md",
    ):
        assert not (dest / rel).exists()

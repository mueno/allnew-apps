#!/usr/bin/env python3
"""Discover published AllNew apps from the public App Store and sync app_catalog.json.

Ground truth is the iTunes Lookup API queried by artistId: every app the
company has publicly released appears there, independent of whether anyone
remembered to register it anywhere. This removes the manually-maintained
catalog as a discovery choke point (the root cause of landing page misses).

Only ADDS missing apps to the catalog (auto-onboarding). Existing entries are
never mutated, so human curation is preserved.

Slug resolution (multi-signal, deterministic):
  1. catalog["slug_overrides"][app_id]           (explicit mapping)
  2. latin prefix of track name + existing <slug>/index.html support dir
  3. unique support page whose body contains the track name
  4. latin prefix of track name (no dir yet)
  5. fallback "app-<trackId>"                    (flagged for enrichment)
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import update_landing_data as uld

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "landing-automation" / "config" / "app_catalog.json"
LOOKUP_URL = "https://itunes.apple.com/lookup"
LOOKUP_CACHE_SCHEMA = "allnew/artist-lookup-cache/1"
LOOKUP_CACHE_MAX_AGE_SECONDS = 15 * 60


def _canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def build_lookup_cache(
    lookup: dict[str, dict[str, dict[str, Any]]],
    *,
    fetched_at: datetime | None = None,
) -> dict[str, Any]:
    observed = fetched_at or datetime.now(timezone.utc)
    return {
        "schema_version": LOOKUP_CACHE_SCHEMA,
        "fetched_at": observed.replace(microsecond=0).isoformat(),
        "payload_sha256": hashlib.sha256(_canonical_json_bytes(lookup)).hexdigest(),
        "lookup": lookup,
    }


def load_lookup_cache(
    path: Path,
    *,
    at: datetime | None = None,
    max_age_seconds: int = LOOKUP_CACHE_MAX_AGE_SECONDS,
) -> dict[str, dict[str, dict[str, Any]]]:
    try:
        envelope = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("lookup cache is unreadable") from error
    if not isinstance(envelope, dict) or envelope.get("schema_version") != LOOKUP_CACHE_SCHEMA:
        raise ValueError("lookup cache envelope is missing or invalid")
    lookup = envelope.get("lookup")
    if not isinstance(lookup, dict):
        raise ValueError("lookup cache payload is invalid")
    digest = hashlib.sha256(_canonical_json_bytes(lookup)).hexdigest()
    if not hmac.compare_digest(str(envelope.get("payload_sha256") or ""), digest):
        raise ValueError("lookup cache hash mismatch")
    fetched_at = uld.parse_iso_datetime(envelope.get("fetched_at"))
    current = at or datetime.now(timezone.utc)
    if fetched_at is None or fetched_at > current + timedelta(seconds=30):
        raise ValueError("lookup cache timestamp is invalid")
    if current - fetched_at > timedelta(seconds=max_age_seconds):
        raise ValueError("lookup cache is stale")
    return lookup
LOOKUP_COUNTRIES = ("jp", "us")
LOOKUP_RETRIES = 3
HEALTH_GENRES = {"health & fitness", "medical", "ヘルスケア／フィットネス", "メディカル"}
MIN_DERIVED_SLUG_LEN = 4
RESERVED_DIR_NAMES = {"assets", "data", "docs", "en", "ja", "feedback", "test-results"}
SAFE_SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def fetch_artist_apps(artist_id: str, country: str) -> list[dict[str, Any]]:
    """Fetch all public software titles for an artist from one storefront."""
    params = urllib.parse.urlencode(
        {"id": artist_id, "country": country, "entity": "software", "limit": "200"}
    )
    request = urllib.request.Request(
        f"{LOOKUP_URL}?{params}", headers={"User-Agent": "allnew-landing-sync/1.0"}
    )
    last_error: Exception | None = None
    for attempt in range(1, LOOKUP_RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:  # nosec: fixed Apple endpoint
                payload = json.loads(response.read().decode("utf-8"))
            return [
                item
                for item in payload.get("results", [])
                if isinstance(item, dict) and item.get("wrapperType") == "software"
            ]
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            last_error = error
            if attempt < LOOKUP_RETRIES:
                time.sleep(2 * attempt)
    raise RuntimeError(f"artist lookup failed for country={country}: {last_error}")


def fetch_artist_lookup(artist_id: str) -> dict[str, dict[str, dict[str, Any]]]:
    """Return {country: {app_id: track}} for all lookup countries."""
    lookup: dict[str, dict[str, dict[str, Any]]] = {}
    for country in LOOKUP_COUNTRIES:
        apps = fetch_artist_apps(artist_id, country)
        lookup[country] = {str(item["trackId"]): item for item in apps if item.get("trackId")}
    return lookup


def derive_latin_slug(name: str) -> str:
    """Leading ASCII-alphanumeric run of a track name, lowercased."""
    match = re.match(r"[A-Za-z0-9]+", name.strip())
    if not match:
        return ""
    candidate = match.group(0).lower()
    return candidate if len(candidate) >= MIN_DERIVED_SLUG_LEN else ""


def support_page_dirs(root: Path) -> list[Path]:
    return sorted(
        path
        for path in root.iterdir()
        if path.is_dir()
        and not path.name.startswith((".", "_"))
        and path.name not in RESERVED_DIR_NAMES
        and (path / "index.html").exists()
    )


def match_support_page_by_name(root: Path, names: list[str]) -> str:
    """Unique support dir whose index.html body contains one of the names."""
    matches: set[str] = set()
    for directory in support_page_dirs(root):
        try:
            body = (directory / "index.html").read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if any(name and name in body for name in names):
            matches.add(directory.name)
    if len(matches) == 1:
        return matches.pop()
    return ""


def resolve_slug(
    app_id: str,
    track_jp: dict[str, Any],
    track_us: dict[str, Any],
    overrides: dict[str, str],
    root: Path,
) -> tuple[str, str]:
    """Return (slug, resolution_method)."""
    override = overrides.get(app_id)
    if override:
        return override, "override"

    names = [str(track_us.get("trackName") or ""), str(track_jp.get("trackName") or "")]
    for name in names:
        derived = derive_latin_slug(name)
        if derived and (root / derived / "index.html").exists():
            return derived, "derived_dir"

    matched = match_support_page_by_name(root, names)
    if matched:
        return matched, "support_page_match"

    for name in names:
        derived = derive_latin_slug(name)
        if derived:
            return derived, "derived"

    return f"app-{app_id}", "fallback"


def support_page_product_name(root: Path, slug: str) -> str:
    """Extract product name from '<title>Name Support</title>' of the support page."""
    page = root / slug / "index.html"
    if not page.exists():
        return ""
    try:
        body = page.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return ""
    match = re.search(r"<title>([^<]+)</title>", body)
    if not match:
        return ""
    title = match.group(1).strip()
    return re.sub(r"\s*Support\s*$", "", title).strip()


def split_names(track_jp: dict[str, Any], product_name: str) -> tuple[str, str]:
    """Return (name, name_ja) mirroring catalog conventions."""
    track_name = str(track_jp.get("trackName") or "").strip()
    latin_prefix = re.match(r"[A-Za-z0-9][A-Za-z0-9 .+&-]*", track_name)
    remainder = ""
    if latin_prefix:
        remainder = track_name[latin_prefix.end():].strip(" -–—:：|")
    name = product_name or (latin_prefix.group(0).strip() if latin_prefix else track_name)
    name_ja = remainder or track_name
    return name, name_ja


def genre_to_category(track: dict[str, Any]) -> str:
    genres = {str(track.get("primaryGenreName") or "").lower()}
    genres |= {str(genre).lower() for genre in track.get("genres") or []}
    if genres & HEALTH_GENRES:
        return "health"
    return "productivity"


def first_sentence(text: str, limit: int = 120) -> str:
    flattened = " ".join(str(text or "").split())
    if not flattened:
        return ""
    for terminator in ("。", ". "):
        index = flattened.find(terminator)
        if 0 < index < limit:
            return flattened[: index + len(terminator)].strip()
    if len(flattened) <= limit:
        return flattened
    truncated = flattened[:limit]
    if " " in truncated:
        truncated = truncated.rsplit(" ", 1)[0]
    return truncated.rstrip(" ,、;:") + "…"


def resolve_icon_path(root: Path, slug: str, track: dict[str, Any], *, force: bool = False) -> str:
    """Prefer the repo-root icon convention; else download the store artwork.

    force=True re-downloads a machine-owned assets/app-icons/ file (used when
    the store artwork URL changed). Root-convention icons are curated assets
    and are never overwritten.
    """
    root_icon = root / f"{slug}-icon.png"
    if root_icon.exists():
        return f"{slug}-icon.png"

    artwork_url = str(track.get("artworkUrl512") or track.get("artworkUrl100") or "")
    if not artwork_url:
        return ""
    try:
        secure_url = uld.validate_screenshot_url(artwork_url)
    except ValueError as error:
        print(f"[WARN] icon URL rejected for {slug}: {error}")
        return ""

    icons_dir = root / "assets" / "app-icons"
    icons_dir.mkdir(parents=True, exist_ok=True)
    extension = uld.guess_extension(secure_url)
    target = icons_dir / f"{slug}-icon{extension}"
    if force or not target.exists():
        request = urllib.request.Request(
            secure_url, headers={"User-Agent": "allnew-landing-sync/1.0"}
        )
        try:
            with uld.open_screenshot(request, timeout=30) as response:
                content_type = str(response.headers.get("Content-Type", ""))
                if not content_type.lower().startswith("image/"):
                    raise RuntimeError("icon response is not image content")
                data = response.read(uld.MAX_SCREENSHOT_BYTES + 1)
            if len(data) > uld.MAX_SCREENSHOT_BYTES:
                raise RuntimeError("icon exceeds max allowed size")
            target.write_bytes(data)
        except (urllib.error.URLError, TimeoutError, RuntimeError) as error:
            print(f"[WARN] icon download failed for {slug}: {error}")
            return ""
    return target.relative_to(root).as_posix()


def find_onboarding_image(root: Path, slug: str) -> str:
    for extension in ("jpeg", "jpg", "png"):
        candidate = root / "assets" / "onboarding" / f"{slug}-onboarding1.{extension}"
        if candidate.exists():
            return candidate.relative_to(root).as_posix()
    return ""


def find_store_screenshot(root: Path, slug: str, *, locale: str = "") -> str:
    """A committed App Store first-screenshot asset for this app, if present.

    This is the card image fallback for apps with no onboarding capture:
    a real store banner, never the app icon. locale="en" looks for the
    English (US storefront) variant `<slug>-en.<ext>`.
    """
    suffix = f"-{locale}" if locale else ""
    for extension in ("jpg", "jpeg", "png", "webp"):
        candidate = root / "assets" / "asc-screenshots" / f"{slug}{suffix}.{extension}"
        if candidate.exists():
            return candidate.relative_to(root).as_posix()
    return ""


def resolve_card_image(root: Path, slug: str) -> str:
    """Card image = onboarding first slide, else App Store first screenshot.

    Never the app icon: the card design shows a real app screen; a large icon
    is a visual regression (see 2026-07-03 fix). Empty when neither exists,
    which the enrichment backlog flags for a human to supply.
    """
    return find_onboarding_image(root, slug) or find_store_screenshot(root, slug)


def build_catalog_entry(
    app_id: str,
    slug: str,
    resolution: str,
    track_jp: dict[str, Any],
    track_us: dict[str, Any],
    root: Path,
    sort_order: int,
) -> dict[str, Any]:
    product_name = support_page_product_name(root, slug)
    name, name_ja = split_names(track_jp or track_us, product_name)
    category = genre_to_category(track_jp or track_us)
    has_support_page = (root / slug / "index.html").exists()
    track = track_jp or track_us
    icon_path = resolve_icon_path(root, slug, track)
    # Card image is a real app screen (onboarding slide or store screenshot),
    # never the icon. promo mirrors any store screenshot for the Featured slot.
    card_image_path = resolve_card_image(root, slug)
    store_screenshot = find_store_screenshot(root, slug)
    store_screenshot_en = find_store_screenshot(root, slug, locale="en")

    return {
        "slug": slug,
        "name": name,
        "name_ja": name_ja,
        "category": category,
        "category_label": category.title(),
        "description_ja": first_sentence((track_jp or {}).get("description", "")),
        "description_en": first_sentence((track_us or {}).get("description", "")),
        "icon_path": icon_path,
        "fallback_image_path": "",
        "promo_image_path": store_screenshot,
        "promo_image_source": "asc_first_screenshot" if store_screenshot else "catalog",
        "card_image_path_en": store_screenshot_en,
        "promo_image_path_en": store_screenshot_en,
        "card_image_path": card_image_path,
        "input_methods": [],
        "is_health_app": category == "health",
        "support_path": f"{slug}/?lang=ja" if has_support_page else "",
        "app_store_url": str(track.get("trackViewUrl") or "").split("?")[0],
        "bundle_id": str(track.get("bundleId") or ""),
        "asc_app_id": app_id,
        "sort_order": sort_order,
        "featured_priority": 999,
        "bootstrap_visible": False,
        "auto_onboarded": True,
        "slug_resolution": resolution,
    }


def sync_catalog(
    root: Path,
    catalog: dict[str, Any],
    lookup: dict[str, dict[str, dict[str, Any]]],
) -> tuple[bool, list[dict[str, Any]]]:
    """Add catalog entries for public apps the catalog does not know. Never mutates existing entries."""
    apps = catalog.setdefault("apps", [])
    known_app_ids = {str(app.get("asc_app_id")) for app in apps if app.get("asc_app_id")}
    known_slugs = {app.get("slug") for app in apps}
    overrides = {
        str(key): str(value)
        for key, value in (catalog.get("slug_overrides") or {}).items()
    }

    public_ids = sorted(
        set(lookup.get("jp", {})) | set(lookup.get("us", {})),
        key=lambda app_id: str(
            (lookup.get("jp", {}).get(app_id) or lookup.get("us", {}).get(app_id) or {}).get(
                "releaseDate", ""
            )
        ),
    )
    max_sort = max((int(app.get("sort_order", 0)) for app in apps), default=0)

    onboarded: list[dict[str, Any]] = []
    for app_id in public_ids:
        if app_id in known_app_ids:
            continue
        track_jp = lookup.get("jp", {}).get(app_id) or {}
        track_us = lookup.get("us", {}).get(app_id) or {}
        slug, resolution = resolve_slug(app_id, track_jp, track_us, overrides, root)
        if not SAFE_SLUG_PATTERN.match(slug):
            # Slugs become filesystem paths and URLs; never accept anything else.
            print(f"[WARN] unsafe slug rejected, using fallback: {slug!r} ({app_id})")
            slug, resolution = f"app-{app_id}", "fallback"
        if slug in known_slugs:
            print(f"[WARN] resolved slug already in catalog, skipping onboard: {slug} ({app_id})")
            continue
        max_sort += 10
        entry = build_catalog_entry(app_id, slug, resolution, track_jp, track_us, root, max_sort)
        apps.append(entry)
        known_slugs.add(slug)
        known_app_ids.add(app_id)
        onboarded.append(entry)
        print(
            f"[ONBOARD] {slug} ({app_id}) name={entry['name']!r} "
            f"category={entry['category']} slug_resolution={resolution}"
        )

    return bool(onboarded), onboarded


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync app catalog from public App Store artist lookup")
    parser.add_argument("--catalog", type=Path, default=CATALOG_PATH)
    parser.add_argument("--root", type=Path, default=ROOT, help="Repo root (support dirs / assets)")
    parser.add_argument("--artist-id", default=None, help="Override catalog artist_id")
    parser.add_argument(
        "--lookup-cache",
        type=Path,
        default=None,
        help="Write the fetched lookup payload here for reuse by the parity gate",
    )
    parser.add_argument(
        "--lookup-file",
        type=Path,
        default=None,
        help="Use a pre-fetched lookup payload instead of querying Apple (tests/offline)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    catalog = uld.load_json(args.catalog, {})
    if not catalog.get("apps"):
        raise RuntimeError(f"catalog has no apps: {args.catalog}")

    artist_id = str(args.artist_id or catalog.get("artist_id") or "")
    if not artist_id:
        raise RuntimeError("artist_id missing: set top-level artist_id in app_catalog.json")

    if args.lookup_file:
        lookup = json.loads(args.lookup_file.read_text(encoding="utf-8"))
    else:
        lookup = fetch_artist_lookup(artist_id)

    total_public = len(set(lookup.get("jp", {})) | set(lookup.get("us", {})))
    if total_public == 0:
        raise RuntimeError("artist lookup returned zero public apps; refusing to proceed")

    if args.lookup_cache:
        args.lookup_cache.parent.mkdir(parents=True, exist_ok=True)
        args.lookup_cache.write_text(
            json.dumps(build_lookup_cache(lookup), ensure_ascii=False), encoding="utf-8"
        )

    changed, onboarded = sync_catalog(args.root, catalog, lookup)
    if changed:
        uld.save_json_if_changed(args.catalog, catalog)

    print(
        json.dumps(
            {
                "public_apps": total_public,
                "onboarded": [entry["slug"] for entry in onboarded],
                "catalog_changed": changed,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

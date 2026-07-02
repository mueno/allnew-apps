#!/usr/bin/env python3
"""Converge landing content with the published App Store content — safely.

Ownership model (the "safe" part):
  - auto_onboarded=true entries are MACHINE-OWNED: store-derived fields
    (name, name_ja, descriptions, category, store URL, icon artwork) are
    recomputed from the current store listing on every run, so a store-side
    change converges automatically. Human-enriched fields (input_methods,
    sort_order, support_path, onboarding card images, featured_priority)
    are never touched. Removing the auto_onboarded flag hands the whole
    entry to humans and automation stops editing it entirely.
  - Curated entries (no flag) are NEVER modified. Store-side changes
    (rename, new icon artwork) are only DETECTED and surfaced as warnings
    in state/content_observations.json + stdout, for a human to apply.

Observation state (machine-owned): landing-automation/state/content_observations.json
keeps the last-seen track name / icon URL per app so changes are detected
exactly once per transition (first sighting establishes a baseline).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import store_discovery as sd
import update_landing_data as uld

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "landing-automation" / "config" / "app_catalog.json"
OBSERVATIONS_PATH = ROOT / "landing-automation" / "state" / "content_observations.json"

# Store-derived fields automation may rewrite on machine-owned entries.
REFRESHED_FIELDS = (
    "name",
    "name_ja",
    "description_ja",
    "description_en",
    "category",
    "category_label",
    "is_health_app",
    "app_store_url",
)


def track_for(app_id: str, lookup: dict[str, dict[str, dict[str, Any]]], country: str) -> dict[str, Any]:
    return lookup.get(country, {}).get(app_id) or {}


def current_signature(app_id: str, lookup: dict[str, dict[str, dict[str, Any]]]) -> dict[str, str]:
    track = track_for(app_id, lookup, "jp") or track_for(app_id, lookup, "us")
    return {
        "track_name": str(track.get("trackName") or ""),
        "icon_url": str(track.get("artworkUrl512") or track.get("artworkUrl100") or ""),
    }


def refresh_machine_owned_entry(
    entry: dict[str, Any],
    app_id: str,
    lookup: dict[str, dict[str, dict[str, Any]]],
    root: Path,
    icon_changed: bool,
) -> bool:
    """Recompute store-derived fields from the current listing. Returns True if changed."""
    track_jp = track_for(app_id, lookup, "jp")
    track_us = track_for(app_id, lookup, "us")
    track = track_jp or track_us
    slug = str(entry["slug"])

    product_name = sd.support_page_product_name(root, slug)
    name, name_ja = sd.split_names(track_jp or track_us, product_name)
    category = sd.genre_to_category(track_jp or track_us)
    fresh = {
        "name": name,
        "name_ja": name_ja,
        "description_ja": sd.first_sentence((track_jp or {}).get("description", "")),
        "description_en": sd.first_sentence((track_us or {}).get("description", "")),
        "category": category,
        "category_label": category.title(),
        "is_health_app": category == "health",
        "app_store_url": str(track.get("trackViewUrl") or "").split("?")[0],
    }

    changed = False
    for field in REFRESHED_FIELDS:
        if entry.get(field) != fresh.get(field):
            entry[field] = fresh.get(field)
            changed = True

    if icon_changed:
        old_icon = str(entry.get("icon_path") or "")
        if old_icon.startswith("assets/app-icons/") or not old_icon:
            track = track_jp or track_us
            new_icon = sd.resolve_icon_path(root, slug, track, force=True)
            if new_icon and new_icon != old_icon:
                entry["icon_path"] = new_icon
                changed = True
            if new_icon and entry.get("card_image_path") in ("", old_icon):
                entry["card_image_path"] = sd.find_onboarding_image(root, slug) or new_icon
                changed = True
        # Root-convention icons (<slug>-icon.png) are curated assets: warn only.

    return changed


def sync_content(
    root: Path,
    catalog: dict[str, Any],
    lookup: dict[str, dict[str, dict[str, Any]]],
    observations: dict[str, Any],
) -> tuple[bool, dict[str, Any]]:
    """Returns (catalog_changed, next_observations)."""
    seen: dict[str, Any] = observations.get("apps") if isinstance(observations.get("apps"), dict) else {}
    next_seen: dict[str, dict[str, str]] = {}
    warnings: list[dict[str, str]] = []
    catalog_changed = False

    public_ids = set(lookup.get("jp", {})) | set(lookup.get("us", {}))

    for entry in catalog.get("apps", []):
        app_id = str(entry.get("asc_app_id") or "")
        if not app_id or app_id not in public_ids:
            continue

        signature = current_signature(app_id, lookup)
        previous = seen.get(app_id) if isinstance(seen.get(app_id), dict) else None
        baseline = previous is None
        name_changed = bool(previous) and previous.get("track_name") != signature["track_name"]
        icon_changed = bool(previous) and previous.get("icon_url") != signature["icon_url"]
        next_seen[app_id] = {"slug": str(entry.get("slug", "")), **signature}

        if entry.get("auto_onboarded"):
            # Machine-owned: converge on the store content. On the baseline
            # run icons are refreshed only if the file is missing.
            if refresh_machine_owned_entry(entry, app_id, lookup, root, icon_changed):
                catalog_changed = True
                print(f"[CONTENT] refreshed machine-owned entry: {entry['slug']} ({app_id})")
            continue

        if baseline:
            continue
        if name_changed:
            warnings.append({
                "app_id": app_id,
                "slug": str(entry.get("slug", "")),
                "kind": "store_rename",
                "detail": f"store name changed: {previous.get('track_name')!r} -> {signature['track_name']!r}; curated entry left untouched",
            })
        if icon_changed:
            warnings.append({
                "app_id": app_id,
                "slug": str(entry.get("slug", "")),
                "kind": "icon_changed",
                "detail": "store icon artwork changed; curated icon asset left untouched",
            })

    for warning in warnings:
        print(f"[CONTENT:WARN] {warning['slug']} ({warning['app_id']}): {warning['detail']}")

    next_observations = {
        "schema_version": 1,
        "updated_at": uld.now_iso(),
        "apps": dict(sorted(next_seen.items())),
        "warnings": warnings,
    }
    comparable_prev = {k: v for k, v in observations.items() if k != "updated_at"}
    comparable_next = {k: v for k, v in next_observations.items() if k != "updated_at"}
    if comparable_prev == comparable_next and observations.get("updated_at"):
        next_observations["updated_at"] = observations["updated_at"]

    return catalog_changed, next_observations


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Converge landing content with published store content")
    parser.add_argument("--catalog", type=Path, default=CATALOG_PATH)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--observations", type=Path, default=OBSERVATIONS_PATH)
    parser.add_argument("--lookup-file", type=Path, required=True,
                        help="Lookup payload from store_discovery --lookup-cache")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    catalog = uld.load_json(args.catalog, {})
    if not catalog.get("apps"):
        raise RuntimeError(f"catalog has no apps: {args.catalog}")
    lookup = json.loads(args.lookup_file.read_text(encoding="utf-8"))
    observations = uld.load_json(args.observations, {"schema_version": 1, "apps": {}, "warnings": []})

    catalog_changed, next_observations = sync_content(args.root, catalog, lookup, observations)
    if catalog_changed:
        uld.save_json_if_changed(args.catalog, catalog)
    uld.save_json_if_changed(args.observations, next_observations)

    print(json.dumps({
        "catalog_changed": catalog_changed,
        "warnings": len(next_observations["warnings"]),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

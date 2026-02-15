#!/usr/bin/env python3
"""Update landing app data from catalog + optional ASC webhook event payload.

This script intentionally does NOT edit any per-app support pages.
It only updates:
- data/landing-apps.generated.json
- landing-automation/state/landing_state.json
- assets/asc-screenshots/* (downloaded from ASC-provided screenshot URLs)
"""

from __future__ import annotations

import argparse
import json
import shutil
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "landing-automation" / "config" / "app_catalog.json"
OUTPUT_PATH = ROOT / "data" / "landing-apps.generated.json"
STATE_PATH = ROOT / "landing-automation" / "state" / "landing_state.json"
ASSETS_DIR = ROOT / "assets" / "asc-screenshots"

VISIBLE_STATUSES = {"submitted", "released"}
STATE_SUBMITTED = {
    "WAITING_FOR_REVIEW",
    "IN_REVIEW",
    "PENDING_DEVELOPER_RELEASE",
    "PENDING_APPLE_RELEASE",
    "PENDING_CONTRACT",
    "PROCESSING_FOR_DISTRIBUTION",
    "PREORDER_READY_FOR_SALE",
}
STATE_RELEASED = {
    "READY_FOR_DISTRIBUTION",
    "READY_FOR_SALE",
}


def load_json(path: Path, default_value: Any) -> Any:
    if not path.exists():
        return default_value
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_json_if_changed(path: Path, payload: Any) -> bool:
    new_content = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    old_content = ""
    if path.exists():
        old_content = path.read_text(encoding="utf-8")
    if old_content == new_content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(new_content, encoding="utf-8")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Update landing app JSON")
    parser.add_argument(
        "--event-file",
        type=Path,
        default=None,
        help="Path to webhook event payload JSON",
    )
    parser.add_argument(
        "--catalog",
        type=Path,
        default=CATALOG_PATH,
        help="Path to app catalog JSON",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help="Path to generated landing JSON",
    )
    parser.add_argument(
        "--state",
        type=Path,
        default=STATE_PATH,
        help="Path to state cache JSON",
    )
    parser.add_argument(
        "--bootstrap",
        action="store_true",
        help="Generate data from catalog bootstrap set only",
    )
    return parser.parse_args()


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_status(raw_status: str | None) -> str:
    if not raw_status:
        return "unknown"
    upper = raw_status.upper()
    if upper in STATE_RELEASED:
        return "released"
    if upper in STATE_SUBMITTED:
        return "submitted"
    if "REJECT" in upper:
        return "rejected"
    if "PREPARE" in upper or "DEVELOPER" in upper:
        return "draft"
    return "unknown"


def file_hash(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 128), b""):
            digest.update(chunk)
    return digest.hexdigest()


def guess_extension(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    extension = Path(parsed.path).suffix.lower()
    if extension in {".png", ".jpg", ".jpeg", ".webp"}:
        return extension
    return ".jpg"


def download_screenshot(url: str, slug: str) -> tuple[str, bool]:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    extension = guess_extension(url)
    target = ASSETS_DIR / f"{slug}{extension}"
    temp_file = ASSETS_DIR / f".{slug}.tmp{extension}"

    request = urllib.request.Request(url, headers={"User-Agent": "allnew-landing-sync/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:  # nosec: URL comes from trusted ASC event pipeline
        with temp_file.open("wb") as file:
            shutil.copyfileobj(response, file)

    changed = True
    if target.exists() and file_hash(target) == file_hash(temp_file):
        changed = False

    if changed:
        temp_file.replace(target)
    else:
        temp_file.unlink(missing_ok=True)

    return target.relative_to(ROOT).as_posix(), changed


def build_catalog_maps(catalog: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, str], dict[str, str]]:
    by_slug: dict[str, dict[str, Any]] = {}
    by_bundle: dict[str, str] = {}
    by_app_id: dict[str, str] = {}

    for app in catalog.get("apps", []):
        slug = app["slug"]
        by_slug[slug] = app
        bundle_id = app.get("bundle_id")
        app_id = app.get("asc_app_id")
        if bundle_id:
            by_bundle[bundle_id] = slug
        if app_id:
            by_app_id[app_id] = slug

    return by_slug, by_bundle, by_app_id


def default_output_entry(app: dict[str, Any]) -> dict[str, Any]:
    return {
        "slug": app["slug"],
        "name": app.get("name", ""),
        "name_ja": app.get("name_ja", ""),
        "status": "released" if app.get("bootstrap_visible") else "draft",
        "category": app.get("category", "camera"),
        "category_label": app.get("category_label", ""),
        "description_ja": app.get("description_ja", ""),
        "icon_path": app.get("icon_path", ""),
        "promo_image_path": app.get("fallback_image_path", ""),
        "promo_image_source": "catalog",
        "support_path": app.get("support_path", ""),
        "app_store_url": app.get("app_store_url", ""),
        "bundle_id": app.get("bundle_id", ""),
        "asc_app_id": app.get("asc_app_id", ""),
        "featured_priority": int(app.get("featured_priority", 999)),
        "sort_order": int(app.get("sort_order", 999)),
        "published_to_landing": bool(app.get("bootstrap_visible", False)),
        "updated_at": now_iso(),
    }


def sort_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(entries, key=lambda item: (int(item.get("sort_order", 999)), item.get("slug", "")))


def ensure_bootstrap_data(catalog: dict[str, Any], existing_output: dict[str, Any]) -> dict[str, Any]:
    apps: list[dict[str, Any]] = []
    for catalog_app in catalog.get("apps", []):
        if not catalog_app.get("bootstrap_visible"):
            continue
        apps.append(default_output_entry(catalog_app))

    return {
        "schema_version": 1,
        "generated_at": now_iso(),
        "source": "bootstrap",
        "apps": sort_entries(apps),
    }


def parse_event_payload(event_data: dict[str, Any]) -> list[dict[str, Any]]:
    client_payload = event_data.get("client_payload", event_data)
    apps = client_payload.get("apps")
    if isinstance(apps, list):
        return [item for item in apps if isinstance(item, dict)]

    app = client_payload.get("app")
    if isinstance(app, dict):
        return [app]

    if isinstance(client_payload, dict) and "slug" in client_payload:
        return [client_payload]

    return []


def resolve_slug(
    app_payload: dict[str, Any],
    by_slug: dict[str, dict[str, Any]],
    by_bundle: dict[str, str],
    by_app_id: dict[str, str],
) -> str | None:
    slug = app_payload.get("slug")
    if slug and slug in by_slug:
        return slug

    bundle_id = app_payload.get("bundle_id") or app_payload.get("bundleId")
    if bundle_id and bundle_id in by_bundle:
        return by_bundle[bundle_id]

    app_id = app_payload.get("asc_app_id") or app_payload.get("appStoreId") or app_payload.get("app_id")
    if app_id and str(app_id) in by_app_id:
        return by_app_id[str(app_id)]

    return None


def build_entry_from_event(
    existing_entry: dict[str, Any] | None,
    catalog_entry: dict[str, Any],
    payload: dict[str, Any],
) -> dict[str, Any]:
    entry = default_output_entry(catalog_entry)
    if existing_entry:
        entry.update(existing_entry)

    status = normalize_status(
        payload.get("status") or payload.get("app_store_state") or payload.get("appStoreState")
    )
    if status != "unknown":
        entry["status"] = status
        entry["published_to_landing"] = status in VISIBLE_STATUSES

    name = payload.get("name") or payload.get("app_name")
    if name:
        entry["name"] = name

    name_ja = payload.get("name_ja")
    if name_ja:
        entry["name_ja"] = name_ja

    description = payload.get("description_ja")
    if description:
        entry["description_ja"] = description

    app_store_url = payload.get("app_store_url") or payload.get("appStoreUrl")
    if app_store_url:
        entry["app_store_url"] = app_store_url

    asc_app_id = payload.get("asc_app_id") or payload.get("appStoreId")
    if asc_app_id:
        entry["asc_app_id"] = str(asc_app_id)

    bundle_id = payload.get("bundle_id") or payload.get("bundleId")
    if bundle_id:
        entry["bundle_id"] = bundle_id

    screenshot_url = payload.get("first_screenshot_url") or payload.get("promo_image_url")
    if screenshot_url:
        try:
            relative_path, _changed = download_screenshot(screenshot_url, entry["slug"])
            entry["promo_image_path"] = relative_path
            entry["promo_image_source"] = "asc_first_screenshot"
        except urllib.error.URLError as error:
            print(f"[WARN] screenshot download failed for {entry['slug']}: {error}")

    if not entry.get("promo_image_path") and catalog_entry.get("fallback_image_path"):
        entry["promo_image_path"] = catalog_entry["fallback_image_path"]
        entry["promo_image_source"] = "catalog"

    entry["updated_at"] = now_iso()
    return entry


def update_from_event(
    catalog: dict[str, Any],
    state: dict[str, Any],
    existing_output: dict[str, Any],
    event_data: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    by_slug, by_bundle, by_app_id = build_catalog_maps(catalog)

    entries_by_slug: dict[str, dict[str, Any]] = {
        app["slug"]: app for app in existing_output.get("apps", []) if isinstance(app, dict) and "slug" in app
    }

    processed_ids = state.get("processed_event_ids", [])
    if not isinstance(processed_ids, list):
        processed_ids = []

    event_id = event_data.get("id") or event_data.get("delivery_id")
    if event_id and event_id in processed_ids:
        print(f"[INFO] event already processed: {event_id}")
        return existing_output, state

    payload_apps = parse_event_payload(event_data)
    if not payload_apps:
        print("[WARN] no app payload found in event")
        return existing_output, state

    for payload in payload_apps:
        slug = resolve_slug(payload, by_slug, by_bundle, by_app_id)
        if not slug:
            print(f"[WARN] could not resolve app slug for payload keys={sorted(payload.keys())}")
            continue

        catalog_entry = by_slug[slug]
        existing_entry = entries_by_slug.get(slug)
        entry = build_entry_from_event(existing_entry, catalog_entry, payload)
        entries_by_slug[slug] = entry

    filtered_entries = [
        entry
        for entry in entries_by_slug.values()
        if entry.get("published_to_landing") and entry.get("status") in VISIBLE_STATUSES
    ]

    next_output = {
        "schema_version": 1,
        "generated_at": now_iso(),
        "source": "event",
        "apps": sort_entries(filtered_entries),
    }

    if event_id:
        processed_ids.append(str(event_id))
        processed_ids = processed_ids[-200:]

    next_state = {
        "schema_version": 1,
        "updated_at": now_iso(),
        "processed_event_ids": processed_ids,
        "statuses": {entry["slug"]: entry.get("status", "unknown") for entry in entries_by_slug.values()},
    }

    return next_output, next_state


def main() -> int:
    args = parse_args()

    catalog = load_json(args.catalog, {"apps": []})
    if not catalog.get("apps"):
        raise RuntimeError(f"catalog has no apps: {args.catalog}")

    current_output = load_json(args.output, {})
    current_state = load_json(args.state, {"schema_version": 1, "processed_event_ids": [], "statuses": {}})

    if args.bootstrap or not args.event_file:
        next_output = ensure_bootstrap_data(catalog, current_output)
        next_state = {
            "schema_version": 1,
            "updated_at": now_iso(),
            "processed_event_ids": current_state.get("processed_event_ids", []),
            "statuses": {entry["slug"]: entry.get("status", "unknown") for entry in next_output["apps"]},
        }
    else:
        event_data = load_json(args.event_file, {})
        next_output, next_state = update_from_event(catalog, current_state, current_output, event_data)

    output_changed = save_json_if_changed(args.output, next_output)
    state_changed = save_json_if_changed(args.state, next_state)

    changed = output_changed or state_changed
    print(f"changed={str(changed).lower()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

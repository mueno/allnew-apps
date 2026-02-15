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
import ipaddress
import json
import os
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
ALLOWED_SCREENSHOT_DOMAINS = tuple(
    domain.strip().lower()
    for domain in os.getenv(
        "LANDING_ALLOWED_SCREENSHOT_DOMAINS",
        "mzstatic.com,apple.com",
    ).split(",")
    if domain.strip()
)
MAX_SCREENSHOT_BYTES = int(os.getenv("LANDING_MAX_SCREENSHOT_BYTES", str(10 * 1024 * 1024)))

VISIBLE_STATUSES = {"submitted", "released"}
HEALTH_APP_CATEGORIES = {"camera", "voice", "sound"}
INPUT_METHOD_LABELS = {
    "camera_ocr": "Camera + OCR",
    "voice_input": "Voice Input",
    "sound_detection": "Sound Detection",
    "camera_ar": "Camera + AR",
}
CATEGORY_DEFAULT_INPUT_METHODS = {
    "camera": ["camera_ocr"],
    "voice": ["voice_input"],
    "sound": ["sound_detection"],
}
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


def as_bool(value: Any, *, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off"}:
            return False
    return default


def default_is_health_app(catalog_app: dict[str, Any]) -> bool:
    fallback = catalog_app.get("category") in HEALTH_APP_CATEGORIES
    return as_bool(catalog_app.get("is_health_app"), default=fallback)


def default_card_image_path(catalog_app: dict[str, Any]) -> str:
    return str(catalog_app.get("card_image_path") or catalog_app.get("fallback_image_path") or "")


def parse_iso_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None

    if len(text) == 10 and text[4] == "-" and text[7] == "-":
        try:
            return datetime.strptime(text, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    normalized = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def normalize_release_date(value: Any) -> str:
    parsed = parse_iso_datetime(value)
    if not parsed:
        return ""
    return parsed.date().isoformat()


def normalize_method_code(value: Any) -> str:
    if not value:
        return ""
    text = str(value).strip().lower()
    if not text:
        return ""

    cleaned = (
        text.replace("&", "_")
        .replace("/", "_")
        .replace("-", "_")
        .replace(" ", "_")
        .replace("+", "_")
    )
    while "__" in cleaned:
        cleaned = cleaned.replace("__", "_")
    cleaned = cleaned.strip("_")

    aliases = {
        "camera": "camera_ocr",
        "ocr": "camera_ocr",
        "camera_ocr": "camera_ocr",
        "voice": "voice_input",
        "speech": "voice_input",
        "voice_input": "voice_input",
        "sound": "sound_detection",
        "audio": "sound_detection",
        "sound_detection": "sound_detection",
        "camera_ar": "camera_ar",
        "ar_camera": "camera_ar",
    }
    return aliases.get(cleaned, cleaned)


def dedupe_keep_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def parse_input_methods(value: Any, *, fallback: list[str] | None = None) -> list[str]:
    fallback_methods = list(fallback or [])

    if isinstance(value, list):
        parsed = [normalize_method_code(item) for item in value]
        filtered = [item for item in parsed if item]
        return dedupe_keep_order(filtered) or dedupe_keep_order(fallback_methods)

    if isinstance(value, str):
        text = value.strip()
        if text:
            parts: list[str]
            if "," in text:
                parts = [item.strip() for item in text.split(",")]
            elif "|" in text:
                parts = [item.strip() for item in text.split("|")]
            elif "/" in text:
                parts = [item.strip() for item in text.split("/")]
            elif " + " in text:
                parts = [item.strip() for item in text.split("+")]
            else:
                parts = [text]

            parsed = [normalize_method_code(item) for item in parts]
            filtered = [item for item in parsed if item]
            return dedupe_keep_order(filtered) or dedupe_keep_order(fallback_methods)

    return dedupe_keep_order(fallback_methods)


def default_input_methods(catalog_app: dict[str, Any]) -> list[str]:
    explicit = parse_input_methods(catalog_app.get("input_methods"), fallback=[])
    if explicit:
        return explicit
    return list(CATEGORY_DEFAULT_INPUT_METHODS.get(str(catalog_app.get("category") or ""), []))


def input_methods_label(methods: list[str]) -> str:
    labels = [INPUT_METHOD_LABELS.get(method, method.replace("_", " ").title()) for method in methods]
    return " + ".join(labels)


def pick_release_date_from_context(payload: dict[str, Any], event_data: dict[str, Any]) -> str:
    client_payload = event_data.get("client_payload", event_data)
    candidates = [
        payload.get("release_date"),
        payload.get("releaseDate"),
        payload.get("released_at"),
        payload.get("releasedAt"),
        payload.get("app_store_released_at"),
        payload.get("appStoreReleasedAt"),
        payload.get("event_date"),
        payload.get("eventDate"),
        client_payload.get("event_date"),
        client_payload.get("eventDate"),
        client_payload.get("received_at"),
        event_data.get("eventDate"),
        event_data.get("created_at"),
    ]
    for candidate in candidates:
        normalized = normalize_release_date(candidate)
        if normalized:
            return normalized
    return ""


def file_hash(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 128), b""):
            digest.update(chunk)
    return digest.hexdigest()


def guess_extension(url: str, content_type: str = "") -> str:
    mime_map = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
    }
    if content_type:
        mime = content_type.split(";", 1)[0].strip().lower()
        if mime in mime_map:
            return mime_map[mime]

    parsed = urllib.parse.urlparse(url)
    extension = Path(parsed.path).suffix.lower()
    if extension in {".png", ".jpg", ".jpeg", ".webp"}:
        return extension
    return ".jpg"


def is_allowed_screenshot_host(hostname: str) -> bool:
    host = hostname.strip().lower().rstrip(".")
    if not host or host == "localhost":
        return False

    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass

    for allowed in ALLOWED_SCREENSHOT_DOMAINS:
        if host == allowed or host.endswith(f".{allowed}"):
            return True
    return False


def validate_screenshot_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme.lower() != "https":
        raise ValueError("screenshot URL must use https")

    if not parsed.hostname or not is_allowed_screenshot_host(parsed.hostname):
        raise ValueError("screenshot URL host is not allowed")

    return parsed.geturl()


def safe_slug(slug: str) -> str:
    normalized = "".join(ch for ch in slug.lower() if ch.isalnum() or ch == "-")
    if not normalized:
        raise ValueError("invalid slug")
    return normalized


def download_screenshot(url: str, slug: str) -> tuple[str, bool]:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    secure_url = validate_screenshot_url(url)
    safe_name = safe_slug(slug)
    extension = guess_extension(secure_url)
    target = ASSETS_DIR / f"{safe_name}{extension}"
    temp_file = ASSETS_DIR / f".{safe_name}.tmp{extension}"

    request = urllib.request.Request(secure_url, headers={"User-Agent": "allnew-landing-sync/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:  # nosec: URL is validated by allowlist before access
            content_type = response.headers.get("Content-Type", "")
            if not content_type.lower().startswith("image/"):
                raise RuntimeError("screenshot response is not image content")

            final_extension = guess_extension(secure_url, content_type)
            if final_extension != extension:
                extension = final_extension
                target = ASSETS_DIR / f"{safe_name}{extension}"
                temp_file = ASSETS_DIR / f".{safe_name}.tmp{extension}"

            total = 0
            with temp_file.open("wb") as file:
                while True:
                    chunk = response.read(64 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_SCREENSHOT_BYTES:
                        raise RuntimeError("screenshot exceeds max allowed size")
                    file.write(chunk)
    except Exception:
        temp_file.unlink(missing_ok=True)
        raise

    changed = True
    if target.exists() and file_hash(target) == file_hash(temp_file):
        changed = False

    if changed:
        temp_file.replace(target)
    else:
        temp_file.unlink(missing_ok=True)

    return target.relative_to(ROOT).as_posix(), changed


def event_identity_key(event_data: dict[str, Any]) -> str:
    client_payload = event_data.get("client_payload", {})
    if not isinstance(client_payload, dict):
        client_payload = {}

    event_id = (
        event_data.get("id")
        or event_data.get("delivery_id")
        or client_payload.get("event_id")
        or client_payload.get("eventId")
    )
    if event_id:
        return f"id:{event_id}"

    canonical = json.dumps(event_data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    digest = sha256(canonical.encode("utf-8")).hexdigest()
    return f"hash:{digest}"


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
    methods = default_input_methods(app)
    return {
        "slug": app["slug"],
        "name": app.get("name", ""),
        "name_ja": app.get("name_ja", ""),
        "status": "released" if app.get("bootstrap_visible") else "draft",
        "category": app.get("category", "camera"),
        "category_label": app.get("category_label", ""),
        "description_ja": app.get("description_ja", ""),
        "description_en": app.get("description_en", ""),
        "icon_path": app.get("icon_path", ""),
        "promo_image_path": app.get("fallback_image_path", ""),
        "card_image_path": default_card_image_path(app),
        "promo_image_source": "catalog",
        "input_methods": methods,
        "input_methods_label": input_methods_label(methods),
        "support_path": app.get("support_path", ""),
        "app_store_url": app.get("app_store_url", ""),
        "bundle_id": app.get("bundle_id", ""),
        "asc_app_id": app.get("asc_app_id", ""),
        "is_health_app": default_is_health_app(app),
        "release_date": normalize_release_date(app.get("release_date")),
        "featured_priority": int(app.get("featured_priority", 999)),
        "sort_order": int(app.get("sort_order", 999)),
        "published_to_landing": bool(app.get("bootstrap_visible", False)),
        "updated_at": now_iso(),
    }


def apply_catalog_defaults(entry: dict[str, Any], catalog_entry: dict[str, Any]) -> dict[str, Any]:
    merged = default_output_entry(catalog_entry)
    merged.update(entry)

    if not merged.get("promo_image_path") and catalog_entry.get("fallback_image_path"):
        merged["promo_image_path"] = catalog_entry["fallback_image_path"]
        merged["promo_image_source"] = "catalog"

    if not merged.get("card_image_path"):
        merged["card_image_path"] = default_card_image_path(catalog_entry)

    merged_methods = parse_input_methods(
        merged.get("input_methods"),
        fallback=default_input_methods(catalog_entry),
    )
    merged["input_methods"] = merged_methods
    merged["input_methods_label"] = input_methods_label(merged_methods)

    merged["is_health_app"] = as_bool(merged.get("is_health_app"), default=default_is_health_app(catalog_entry))
    merged["published_to_landing"] = as_bool(
        merged.get("published_to_landing"),
        default=as_bool(catalog_entry.get("bootstrap_visible"), default=False),
    )

    merged["release_date"] = normalize_release_date(merged.get("release_date"))
    if not merged["release_date"] and merged.get("status") == "released":
        merged["release_date"] = normalize_release_date(merged.get("updated_at")) or normalize_release_date(now_iso())

    return merged


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
    client_payload_raw = event_data.get("client_payload", event_data)
    client_payload = client_payload_raw if isinstance(client_payload_raw, dict) else {}
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
    event_data: dict[str, Any],
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

    description_en = payload.get("description_en") or payload.get("descriptionEn")
    if description_en:
        entry["description_en"] = description_en

    app_store_url = payload.get("app_store_url") or payload.get("appStoreUrl")
    if app_store_url:
        entry["app_store_url"] = app_store_url

    asc_app_id = payload.get("asc_app_id") or payload.get("appStoreId")
    if asc_app_id:
        entry["asc_app_id"] = str(asc_app_id)

    bundle_id = payload.get("bundle_id") or payload.get("bundleId")
    if bundle_id:
        entry["bundle_id"] = bundle_id

    card_image_path = payload.get("card_image_path")
    if card_image_path:
        entry["card_image_path"] = card_image_path

    input_methods = parse_input_methods(payload.get("input_methods"), fallback=[])
    if input_methods:
        entry["input_methods"] = input_methods

    if "is_health_app" in payload:
        entry["is_health_app"] = as_bool(payload.get("is_health_app"), default=entry.get("is_health_app", True))

    if "release_date" in payload or "releaseDate" in payload:
        entry["release_date"] = normalize_release_date(payload.get("release_date") or payload.get("releaseDate"))

    screenshot_url = payload.get("first_screenshot_url") or payload.get("promo_image_url")
    if screenshot_url:
        try:
            relative_path, _changed = download_screenshot(screenshot_url, entry["slug"])
            entry["promo_image_path"] = relative_path
            entry["promo_image_source"] = "asc_first_screenshot"
        except (urllib.error.URLError, ValueError, RuntimeError) as error:
            print(f"[WARN] screenshot download failed for {entry['slug']}: {error}")

    if entry.get("status") == "released":
        resolved_release_date = pick_release_date_from_context(payload, event_data)
        if resolved_release_date:
            entry["release_date"] = resolved_release_date

    entry = apply_catalog_defaults(entry, catalog_entry)

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

    event_key = event_identity_key(event_data)
    if event_key in processed_ids:
        print(f"[INFO] event already processed: {event_key}")
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
        entry = build_entry_from_event(existing_entry, catalog_entry, payload, event_data)
        entries_by_slug[slug] = entry

    normalized_entries: list[dict[str, Any]] = []
    for slug, entry in entries_by_slug.items():
        catalog_entry = by_slug.get(slug)
        if catalog_entry:
            normalized_entries.append(apply_catalog_defaults(entry, catalog_entry))
        else:
            normalized_entries.append(entry)

    filtered_entries = [
        entry
        for entry in normalized_entries
        if entry.get("published_to_landing") and entry.get("status") in VISIBLE_STATUSES
    ]

    next_output = {
        "schema_version": 1,
        "generated_at": now_iso(),
        "source": "event",
        "apps": sort_entries(filtered_entries),
    }

    processed_ids.append(str(event_key))
    processed_ids = processed_ids[-500:]

    next_state = {
        "schema_version": 1,
        "updated_at": now_iso(),
        "processed_event_ids": processed_ids,
        "statuses": {entry["slug"]: entry.get("status", "unknown") for entry in normalized_entries},
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

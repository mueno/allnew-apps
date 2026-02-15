#!/usr/bin/env python3
"""ASC webhook relay.

Receives App Store Connect webhook payloads and forwards normalized events
as GitHub `repository_dispatch` events.

This process is expected to run outside GitHub Pages (e.g. VPS, Cloud Run,
Fly.io, Railway). It does not modify per-app support pages.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DEFAULT_PATH = "/webhooks/asc"
DEFAULT_SIGNATURE_HEADER_CANDIDATES = (
    "X-Apple-Signature",
    "X-ASC-Signature",
    "X-AppStoreConnect-Signature",
    "X-Hub-Signature-256",
)

SUBMITTED_STATES = {
    "WAITING_FOR_REVIEW",
    "IN_REVIEW",
    "PENDING_DEVELOPER_RELEASE",
    "PENDING_APPLE_RELEASE",
    "PROCESSING_FOR_DISTRIBUTION",
    "PREORDER_READY_FOR_SALE",
}

RELEASED_STATES = {
    "READY_FOR_DISTRIBUTION",
    "READY_FOR_SALE",
}
DEFAULT_MAX_REQUEST_BYTES = 1024 * 1024
DEFAULT_REPLAY_TTL_SECONDS = 3600
DEFAULT_EVENT_FRESHNESS_SECONDS = 15 * 60


@dataclass
class RelayConfig:
    github_owner: str
    github_repo: str
    github_token: str
    webhook_secret: str
    host: str
    port: int
    path: str
    signature_header: str
    signature_prefix: str
    catalog_path: Path
    max_request_bytes: int
    replay_ttl_seconds: int
    event_freshness_seconds: int


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_catalog_maps(path: Path) -> tuple[dict[str, str], dict[str, str]]:
    if not path.exists():
        return {}, {}

    payload = json.loads(path.read_text(encoding="utf-8"))
    by_app_id: dict[str, str] = {}
    by_bundle: dict[str, str] = {}

    for app in payload.get("apps", []):
        if not isinstance(app, dict):
            continue
        slug = app.get("slug")
        if not slug:
            continue

        app_id = app.get("asc_app_id")
        if app_id:
            by_app_id[str(app_id)] = slug

        bundle_id = app.get("bundle_id")
        if bundle_id:
            by_bundle[str(bundle_id)] = slug

    return by_app_id, by_bundle


def find_signature_header(headers: dict[str, str], preferred: str) -> str | None:
    if preferred and preferred in headers:
        return preferred

    lowered = {key.lower(): key for key in headers.keys()}
    if preferred:
        preferred_lower = preferred.lower()
        if preferred_lower in lowered:
            return lowered[preferred_lower]

    for candidate in DEFAULT_SIGNATURE_HEADER_CANDIDATES:
        candidate_lower = candidate.lower()
        if candidate_lower in lowered:
            return lowered[candidate_lower]

    return None


def verify_signature(
    body: bytes,
    headers: dict[str, str],
    secret: str,
    signature_header: str,
    signature_prefix: str,
) -> tuple[bool, str]:
    if not secret:
        return False, "webhook secret not configured"

    header_name = find_signature_header(headers, signature_header)
    if not header_name:
        return False, "signature header not found"

    provided = headers.get(header_name, "").strip()
    if signature_prefix and provided.startswith(signature_prefix):
        provided = provided[len(signature_prefix):]

    expected_hex = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    expected_b64 = base64.b64encode(
        hmac.new(secret.encode("utf-8"), body, hashlib.sha256).digest()
    ).decode("ascii")

    if hmac.compare_digest(provided, expected_hex):
        return True, f"verified via {header_name} (hex)"
    if hmac.compare_digest(provided, expected_b64):
        return True, f"verified via {header_name} (base64)"

    return False, "signature mismatch"


def parse_positive_int(value: str, fallback: int) -> int:
    try:
        parsed = int(str(value))
    except (TypeError, ValueError):
        return fallback
    if parsed <= 0:
        return fallback
    return parsed


def is_event_date_fresh(value: str, freshness_seconds: int) -> bool:
    if not value:
        return False
    parsed = value.replace("Z", "+00:00")
    try:
        event_time = datetime.fromisoformat(parsed)
    except ValueError:
        return False
    if event_time.tzinfo is None:
        event_time = event_time.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    delta = abs((now - event_time.astimezone(timezone.utc)).total_seconds())
    return delta <= freshness_seconds


def normalize_status(raw_status: str | None) -> str:
    if not raw_status:
        return "unknown"

    upper = raw_status.upper()
    if upper in RELEASED_STATES:
        return "released"
    if upper in SUBMITTED_STATES:
        return "submitted"
    if "REJECT" in upper:
        return "rejected"
    return "unknown"


def pick_dispatch_event(status: str) -> str:
    if status == "released":
        return "asc_app_released"
    if status == "submitted":
        return "asc_app_submitted"
    return "asc_status_changed"


def to_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def build_normalized_payload(
    payload: dict[str, Any],
    slug_by_app_id: dict[str, str],
    slug_by_bundle: dict[str, str],
) -> dict[str, Any]:
    data = to_dict(payload.get("data"))
    app = to_dict(data.get("app"))
    app_store_version = to_dict(data.get("appStoreVersion"))

    status_raw = (
        app_store_version.get("state")
        or data.get("status")
        or payload.get("status")
        or payload.get("app_store_state")
    )
    normalized_status = normalize_status(status_raw)

    asc_app_id = (
        app.get("id")
        or data.get("appId")
        or payload.get("asc_app_id")
        or payload.get("appStoreId")
        or payload.get("app_id")
    )
    asc_app_id_str = str(asc_app_id) if asc_app_id else ""

    bundle_id = (
        app.get("bundleId")
        or app.get("bundleID")
        or data.get("bundleId")
        or payload.get("bundle_id")
        or payload.get("bundleId")
        or ""
    )

    slug = payload.get("slug")
    if not slug and asc_app_id_str:
        slug = slug_by_app_id.get(asc_app_id_str)
    if not slug and bundle_id:
        slug = slug_by_bundle.get(str(bundle_id))

    first_screenshot_url = (
        payload.get("first_screenshot_url")
        or payload.get("promo_image_url")
        or data.get("firstScreenshotUrl")
        or app_store_version.get("firstScreenshotUrl")
    )
    release_date = (
        payload.get("release_date")
        or payload.get("releaseDate")
        or data.get("releaseDate")
        or app_store_version.get("releaseDate")
        or ""
    )

    normalized = {
        "relay_version": 1,
        "event_id": payload.get("eventId") or payload.get("id") or "",
        "event_type": payload.get("eventType") or payload.get("type") or "",
        "event_date": payload.get("eventDate") or payload.get("event_date") or "",
        "received_at": now_iso(),
        "app": {
            "slug": slug or "",
            "status": status_raw or normalized_status,
            "normalized_status": normalized_status,
            "asc_app_id": asc_app_id_str,
            "bundle_id": bundle_id,
            "name": (
                app.get("name")
                or data.get("appName")
                or payload.get("name")
                or payload.get("app_name")
                or ""
            ),
            "app_store_url": (
                app.get("appStoreUrl")
                or app.get("url")
                or payload.get("app_store_url")
                or payload.get("appStoreUrl")
                or ""
            ),
            "first_screenshot_url": first_screenshot_url or "",
            "release_date": release_date,
        },
    }

    return normalized


def send_repository_dispatch(config: RelayConfig, event_type: str, client_payload: dict[str, Any]) -> None:
    url = f"https://api.github.com/repos/{config.github_owner}/{config.github_repo}/dispatches"
    body = json.dumps(
        {
            "event_type": event_type,
            "client_payload": client_payload,
        }
    ).encode("utf-8")

    request = Request(
        url,
        data=body,
        method="POST",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {config.github_token}",
            "Content-Type": "application/json",
            "User-Agent": "allnew-asc-webhook-relay/1.0",
        },
    )

    with urlopen(request, timeout=20) as response:  # nosec: fixed GitHub API URL
        if response.status not in {204, 201, 200}:
            raise RuntimeError(f"unexpected GitHub response status={response.status}")


class RelayHandler(BaseHTTPRequestHandler):
    config: RelayConfig
    slug_by_app_id: dict[str, str]
    slug_by_bundle: dict[str, str]
    replay_cache: dict[str, float] = {}
    replay_cache_lock = threading.Lock()

    def _write_json(self, status: int, payload: dict[str, Any]) -> None:
        body = (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:
        message = "%s - - [%s] %s" % (
            self.address_string(),
            self.log_date_time_string(),
            format % args,
        )
        print(message)

    @classmethod
    def register_event(cls, event_id: str, ttl_seconds: int) -> bool:
        now = time.time()
        with cls.replay_cache_lock:
            expired = [key for key, expires_at in cls.replay_cache.items() if expires_at <= now]
            for key in expired:
                cls.replay_cache.pop(key, None)

            existing_expires = cls.replay_cache.get(event_id)
            if existing_expires and existing_expires > now:
                return False

            cls.replay_cache[event_id] = now + ttl_seconds
            return True

    def do_POST(self) -> None:  # noqa: N802
        if self.path != self.config.path:
            self._write_json(
                HTTPStatus.NOT_FOUND,
                {"ok": False, "error": "not found"},
            )
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._write_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid content-length"})
            return
        if content_length < 0:
            self._write_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid content-length"})
            return
        if content_length > self.config.max_request_bytes:
            self._write_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": "payload too large"})
            return

        body = self.rfile.read(content_length)
        if len(body) > self.config.max_request_bytes:
            self._write_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": "payload too large"})
            return

        headers = {key: value for key, value in self.headers.items()}
        ok, reason = verify_signature(
            body,
            headers,
            self.config.webhook_secret,
            self.config.signature_header,
            self.config.signature_prefix,
        )
        if not ok:
            print(f"[WARN] signature verification failed: {reason}")
            self._write_json(
                HTTPStatus.UNAUTHORIZED,
                {"ok": False, "error": "unauthorized"},
            )
            return

        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as error:
            self._write_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "error": "invalid json"},
            )
            return

        normalized = build_normalized_payload(payload, self.slug_by_app_id, self.slug_by_bundle)
        event_id = str(normalized.get("event_id") or "").strip()
        if not event_id:
            self._write_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "missing event_id"})
            return

        event_date = str(normalized.get("event_date") or "").strip()
        if not is_event_date_fresh(event_date, self.config.event_freshness_seconds):
            self._write_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid or stale event_date"})
            return

        if not self.register_event(event_id, self.config.replay_ttl_seconds):
            self._write_json(HTTPStatus.CONFLICT, {"ok": False, "error": "duplicate event"})
            return

        event_type = pick_dispatch_event(normalized["app"].get("normalized_status", "unknown"))

        try:
            send_repository_dispatch(self.config, event_type, normalized)
        except (HTTPError, URLError, RuntimeError) as error:
            print(f"[ERROR] failed to dispatch GitHub event: {error}")
            self._write_json(
                HTTPStatus.BAD_GATEWAY,
                {
                    "ok": False,
                    "error": "upstream dispatch failed",
                },
            )
            return

        self._write_json(
            HTTPStatus.ACCEPTED,
            {
                "ok": True,
                "event_type": event_type,
                "event_id": event_id,
            },
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Relay ASC webhook to GitHub repository_dispatch")
    parser.add_argument("--host", default=os.getenv("ASC_RELAY_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.getenv("ASC_RELAY_PORT", "8787")))
    parser.add_argument("--path", default=os.getenv("ASC_RELAY_PATH", DEFAULT_PATH))

    parser.add_argument("--github-owner", default=os.getenv("GITHUB_OWNER", ""))
    parser.add_argument("--github-repo", default=os.getenv("GITHUB_REPO", ""))
    parser.add_argument("--github-token", default=os.getenv("GITHUB_TOKEN", ""))

    parser.add_argument("--webhook-secret", default=os.getenv("ASC_WEBHOOK_SECRET", ""))
    parser.add_argument(
        "--signature-header",
        default=os.getenv("ASC_SIGNATURE_HEADER", "X-Apple-Signature"),
    )
    parser.add_argument(
        "--signature-prefix",
        default=os.getenv("ASC_SIGNATURE_PREFIX", "sha256="),
    )

    parser.add_argument(
        "--catalog",
        type=Path,
        default=(
            Path(__file__).resolve().parents[2]
            / "config"
            / "app_catalog.json"
        ),
    )
    parser.add_argument(
        "--max-request-bytes",
        type=int,
        default=parse_positive_int(os.getenv("ASC_MAX_REQUEST_BYTES", str(DEFAULT_MAX_REQUEST_BYTES)), DEFAULT_MAX_REQUEST_BYTES),
    )
    parser.add_argument(
        "--replay-ttl-seconds",
        type=int,
        default=parse_positive_int(os.getenv("ASC_REPLAY_TTL_SECONDS", str(DEFAULT_REPLAY_TTL_SECONDS)), DEFAULT_REPLAY_TTL_SECONDS),
    )
    parser.add_argument(
        "--event-freshness-seconds",
        type=int,
        default=parse_positive_int(os.getenv("ASC_EVENT_FRESHNESS_SECONDS", str(DEFAULT_EVENT_FRESHNESS_SECONDS)), DEFAULT_EVENT_FRESHNESS_SECONDS),
    )

    return parser.parse_args()


def require(value: str, name: str) -> str:
    if value:
        return value
    raise RuntimeError(f"missing required setting: {name}")


def main() -> int:
    args = parse_args()

    config = RelayConfig(
        github_owner=require(args.github_owner, "--github-owner or GITHUB_OWNER"),
        github_repo=require(args.github_repo, "--github-repo or GITHUB_REPO"),
        github_token=require(args.github_token, "--github-token or GITHUB_TOKEN"),
        webhook_secret=require(args.webhook_secret, "--webhook-secret or ASC_WEBHOOK_SECRET"),
        host=args.host,
        port=args.port,
        path=args.path,
        signature_header=args.signature_header,
        signature_prefix=args.signature_prefix,
        catalog_path=args.catalog,
        max_request_bytes=parse_positive_int(args.max_request_bytes, DEFAULT_MAX_REQUEST_BYTES),
        replay_ttl_seconds=parse_positive_int(args.replay_ttl_seconds, DEFAULT_REPLAY_TTL_SECONDS),
        event_freshness_seconds=parse_positive_int(args.event_freshness_seconds, DEFAULT_EVENT_FRESHNESS_SECONDS),
    )

    slug_by_app_id, slug_by_bundle = load_catalog_maps(config.catalog_path)

    RelayHandler.config = config
    RelayHandler.slug_by_app_id = slug_by_app_id
    RelayHandler.slug_by_bundle = slug_by_bundle

    server = ThreadingHTTPServer((config.host, config.port), RelayHandler)
    print(
        json.dumps(
            {
                "ok": True,
                "message": "ASC webhook relay started",
                "listen": f"http://{config.host}:{config.port}{config.path}",
                "catalog": str(config.catalog_path),
                "mapped_apps": len(slug_by_app_id),
                "signature_required": True,
            },
            ensure_ascii=False,
        )
    )

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

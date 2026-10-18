#!/usr/bin/env python3
"""Build dist/ and assert internal documents 404 while public pages still serve.

The local server applies the same block list as vercel.json routes, so a
markdown file planted back into dist/ still returns 404 with X-Robots-Tag.
"""

from __future__ import annotations

import functools
import json
import os
import sys
import threading
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from public_surface import (
    DIST,
    PUBLIC_PATHS,
    REMOVED_PUBLIC_PATHS,
    build_public_site,
    is_blocked_path,
)


class PublicHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        if is_blocked_path(self.path):
            self._send_blocked()
            return
        super().do_GET()

    def do_HEAD(self) -> None:
        if is_blocked_path(self.path):
            self._send_blocked(include_body=False)
            return
        super().do_HEAD()

    def list_directory(self, path: str | os.PathLike[str]) -> None:
        self.send_error(404, "Not Found")

    def log_message(self, fmt: str, *args: Any) -> None:
        return

    def _send_blocked(self, include_body: bool = True) -> None:
        body = b"Not Found"
        self.send_response(404)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if include_body:
            self.wfile.write(body)


def serve(directory: Path) -> tuple[ThreadingHTTPServer, str]:
    handler = functools.partial(PublicHandler, directory=str(directory))
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    host, port = httpd.server_address[:2]
    return httpd, f"http://{host!s}:{port}"


def fetch(base: str, path: str) -> tuple[int, dict[str, str], bytes]:
    request = urllib.request.Request(base + path, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            headers = {key.lower(): value for key, value in response.headers.items()}
            return response.status, headers, response.read()
    except urllib.error.HTTPError as error:
        headers = {key.lower(): value for key, value in error.headers.items()}
        return error.code, headers, error.read()


def check(dist: Path = DIST) -> list[str]:
    build_public_site(dest=dist)
    failures: list[str] = []
    for rel in REMOVED_PUBLIC_PATHS:
        disk = dist / rel.lstrip("/")
        if disk.exists():
            failures.append(f"still in build output: {rel}")

    httpd, base = serve(dist)
    try:
        for path in REMOVED_PUBLIC_PATHS:
            status, headers, body = fetch(base, path)
            if status != 404:
                failures.append(f"expected 404 for {path}, got {status}")
            robots = headers.get("x-robots-tag", "")
            if "noindex" not in robots.lower():
                failures.append(f"missing X-Robots-Tag noindex for {path} (got {robots!r})")
            if b"Deployment Security" in body or b"BEGIN PRIVATE" in body:
                failures.append(f"blocked path {path} returned document body")

        for path in PUBLIC_PATHS:
            status, _headers, body = fetch(base, path)
            if status != 200:
                failures.append(f"expected 200 for {path}, got {status}")
            elif not body:
                failures.append(f"empty body for {path}")

        # Defense in depth: a markdown file that reappears in dist still 404s.
        planted = dist / "feedback" / "planted-internal.md"
        planted.write_text("internal planted document\n", encoding="utf-8")
        status, headers, body = fetch(base, "/feedback/planted-internal.md")
        if status != 404 or b"planted" in body:
            failures.append("planted markdown was served from dist")
        if "noindex" not in headers.get("x-robots-tag", "").lower():
            failures.append("planted markdown missing noindex")
        planted.unlink()
    finally:
        httpd.shutdown()

    import xml.etree.ElementTree as ET

    sitemap_tree = ET.parse(dist / "sitemap.xml")
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [node.text or "" for node in sitemap_tree.findall("sm:url/sm:loc", ns)]
    for loc in locs:
        for needle in (".md", "/internal/", "/coughwav/", "/weightsnap/", "TECHBLOG_DRAFT"):
            if needle in loc:
                failures.append(f"sitemap loc contains {needle}: {loc}")
    for needle in (
        "https://apps.allnew.work/",
        "https://apps.allnew.work/feedback/",
        "https://apps.allnew.work/anniversary-2026/",
        "https://apps.allnew.work/babyvox/",
    ):
        if needle not in locs:
            failures.append(f"sitemap missing {needle}")

    summary = {
        "dist_files": sum(1 for _ in dist.rglob("*") if _.is_file()),
        "removed_checked": len(REMOVED_PUBLIC_PATHS),
        "public_checked": len(PUBLIC_PATHS),
        "failures": failures,
    }
    print(json.dumps(summary, indent=2))
    return failures


def main() -> int:
    failures = check()
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Rules for the public static site.

Internal drafts stay in the git tree under ``internal/`` and are omitted from
``dist/``. Vercel publishes only ``dist/`` (see ``vercel.json``), so those
files 404 because they are not in the output. ``X-Robots-Tag: noindex`` is
applied with ``headers`` path-to-regexp ``source`` patterns (no inline flags).
The local checker still 404s the block list, so a file that slips back into
the output is not served.
"""

from __future__ import annotations

import json
import os
import posixpath
import shutil
import subprocess
import tempfile
import urllib.parse
from collections.abc import Iterator
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"

# Cloudflare Pages Function that returns a real 404 (+ noindex) for the block
# list at the edge. Cloudflare serves the repo tree, so unlike Vercel it cannot
# rely on the file simply being absent from dist/.
MIDDLEWARE_JS = ROOT / "functions" / "_middleware.js"

# Only this landing-automation file is referenced by the public catalog.
PUBLIC_LANDING_RUNTIME = "landing-automation/runtime/landing-runtime.js"

# Directories that are never part of the public site.
EXCLUDED_DIR_NAMES = {
    ".git",
    ".github",
    ".mypy_cache",
    ".planning",
    ".pytest_cache",
    ".ruff_cache",
    ".vercel",
    ".wrangler",
    "__pycache__",
    "functions",
    "internal",
    "node_modules",
    "scripts",
    "test-results",
    "tests",
}

EXCLUDED_FILE_NAMES = {
    ".DS_Store",
    ".gitignore",
    ".vercelignore",
    "vercel.json",
}

# PCRE-style patterns for the local exposure checker. ``re.search`` against
# the URL path is the intended match. These are not copied into vercel.json:
# Vercel rejects inline flags such as ``(?i)`` and ``routes`` cannot sit next
# to ``redirects`` / ``headers``.
BLOCK_ROUTE_SOURCES = (
    "(?i)/.*\\.md$",
    "(?i)/internal(/.*)?$",
    "(?i)/\\.planning(/.*)?$",
    "(?i)/test-results(/.*)?$",
    "(?i)/scripts(/.*)?$",
    "(?i)/landing-automation/(?!runtime/landing-runtime\\.js$).*$",
)

# path-to-regexp ``source`` values for the X-Robots-Tag headers in vercel.json.
# Matching is case-sensitive, so markdown extensions are listed explicitly.
NOINDEX_HEADER_SOURCES = (
    "/(.*)\\.md",
    "/(.*)\\.MD",
    "/(.*)\\.Md",
    "/(.*)\\.mD",
    "/internal/(.*)",
    "/.planning/(.*)",
    "/test-results/(.*)",
    "/scripts/(.*)",
    "/landing-automation/(.*)",
)

REQUIRED_OUTPUTS = (
    "index.html",
    "robots.txt",
    "sitemap.xml",
    "llms.txt",
    "_headers",
    "_redirects",
    "feedback/index.html",
    "feedback/app.js",
    "feedback/terms.html",
    "feedback/cookie-policy.html",
    "feedback/status-board.html",
    "data/landing-apps.generated.json",
    "anniversary-2026/index.html",
    "anniversary-2026/en/index.html",
    "anniversary-2026/apps.json",
    "weightsnap/index.html",
    "coughwav/index.html",
    "babyvox/index.html",
    PUBLIC_LANDING_RUNTIME,
)

# Paths that must 404 once this change ships. Kept as the regression list.
REMOVED_PUBLIC_PATHS = (
    "/feedback/deployment-security.md",
    "/feedback/legal-draft.md",
    "/feedback/privacy-policy-draft.md",
    "/feedback/audit-report.md",
    "/feedback/product-spec.md",
    "/feedback/ux-concept-2026.md",
    "/feedback/README.md",
    "/TECHBLOG_DRAFT_ZENN.md",
    "/internal/TECHBLOG_DRAFT_ZENN.md",
    "/internal/feedback/deployment-security.md",
    "/test-results/.last-run.json",
    "/.planning/domain-audit-2026-06-13.md",
    "/landing-automation/README.md",
    "/scripts/build_public_site.py",
)

# Attack-path probes. No such files exist, so Vercel 404s them (not in dist/).
# Cloudflare serves the repo tree behind an index.html SPA fallback that would
# answer 200, so functions/_middleware.js blocks them explicitly with a 404.
# These are not in BLOCK_ROUTE_SOURCES because the Vercel side needs no rule.
ATTACK_PROBE_PATHS = (
    "/wp-login.php",
    "/wp-admin/setup-config.php",
    "/wp-includes/load.php",
    "/wp-config.php",
    "/xmlrpc.php",
    "/index.php",
    "/.env",
    "/.env.production",
    "/.git/config",
    "/.svn/entries",
    "/.aws/credentials",
    "/.ssh/id_rsa",
    "/config.json",
    "/credentials.json",
)

# Public pages and assets that must keep working.
PUBLIC_PATHS = (
    "/",
    "/feedback/",
    "/feedback/index.html",
    "/feedback/terms.html",
    "/feedback/app.js",
    "/weightsnap/",
    "/coughwav/",
    "/babyvox/",
    "/anniversary-2026/",
    "/anniversary-2026/en/",
    "/sitemap.xml",
    "/robots.txt",
    "/llms.txt",
    "/data/landing-apps.generated.json",
    "/landing-automation/runtime/landing-runtime.js",
)


def normalize_url_path(path: str) -> str:
    parsed = urllib.parse.urlparse(path)
    raw = urllib.parse.unquote(parsed.path or "/")
    if not raw.startswith("/"):
        raw = "/" + raw
    normalized = posixpath.normpath(raw)
    if not normalized.startswith("/"):
        normalized = "/" + normalized
    return normalized


def is_blocked_path(path: str) -> bool:
    """Return True when the URL must be 404 and noindex."""
    import re

    normalized = normalize_url_path(path)
    for source in BLOCK_ROUTE_SOURCES:
        if re.search(source, normalized):
            return True
    return False


def _rel_posix(path: Path) -> str:
    return path.as_posix()


def is_excluded_relative(rel: Path) -> bool:
    """Return True when a repo-relative path must not be published."""
    if rel.parts == ():
        return False
    if any(part in EXCLUDED_DIR_NAMES for part in rel.parts):
        return True
    if rel.name in EXCLUDED_FILE_NAMES or rel.name.endswith(".pyc"):
        return True
    if rel.suffix.lower() == ".md":
        return True
    if rel.parts[0] == "landing-automation" and _rel_posix(rel) != PUBLIC_LANDING_RUNTIME:
        # Keep the directory chain that contains the one public runtime script.
        return _rel_posix(rel) not in {"landing-automation", "landing-automation/runtime"}
    return False


def iter_public_files(root: Path = ROOT) -> Iterator[Path]:
    for dirpath, dirnames, filenames in os.walk(root):
        parent = Path(dirpath).relative_to(root)
        kept = []
        for name in dirnames:
            rel = Path(name) if parent == Path(".") else parent / name
            if not is_excluded_relative(rel):
                kept.append(name)
        dirnames[:] = kept
        for name in filenames:
            rel = Path(name) if parent == Path(".") else parent / name
            if is_excluded_relative(rel):
                continue
            yield rel


def build_public_site(root: Path = ROOT, dest: Path = DIST) -> list[str]:
    """Copy the publishable tree to ``dest``. Return the relative posix paths."""
    if dest.exists():
        shutil.rmtree(dest)
    written: list[str] = []
    for rel in iter_public_files(root):
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / rel, target)
        written.append(rel.as_posix())

    missing = [item for item in REQUIRED_OUTPUTS if item not in written]
    if missing:
        raise SystemExit("public build missing required files: " + ", ".join(missing))

    leaked = [item for item in written if item.endswith(".md") or item.startswith("internal/")]
    if leaked:
        raise SystemExit("public build leaked internal files: " + ", ".join(leaked))
    return written


_MIDDLEWARE_RUNNER = (
    'import { isBlockedPath } from "./_middleware.mjs";\n'
    'import { readFileSync } from "node:fs";\n'
    "const paths = JSON.parse(readFileSync(process.argv[2], 'utf8'));\n"
    "const out = {};\n"
    "for (const p of paths) out[p] = isBlockedPath(p);\n"
    "process.stdout.write(JSON.stringify(out));\n"
)


def node_executable() -> str | None:
    """Return the node binary path, or None when node is unavailable."""
    return shutil.which("node")


def run_middleware_matcher(paths: list[str]) -> dict[str, bool] | None:
    """Evaluate ``isBlockedPath`` from functions/_middleware.js over ``paths``.

    Returns ``{path: blocked}`` using the real Cloudflare middleware source, or
    ``None`` when node (or the middleware file) is unavailable so callers can
    skip the cross-check. This proves the Cloudflare edge block list and the
    Python/Vercel block list stay in agreement.
    """
    node = node_executable()
    if node is None or not MIDDLEWARE_JS.is_file():
        return None
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        # Copy to a .mjs sibling so node always parses it as an ES module,
        # independent of any package.json "type" in the repo.
        (tmp_path / "_middleware.mjs").write_text(
            MIDDLEWARE_JS.read_text(encoding="utf-8"), encoding="utf-8"
        )
        runner = tmp_path / "run.mjs"
        runner.write_text(_MIDDLEWARE_RUNNER, encoding="utf-8")
        paths_file = tmp_path / "paths.json"
        paths_file.write_text(json.dumps(paths), encoding="utf-8")
        result = subprocess.run(
            [node, str(runner), str(paths_file)],
            capture_output=True,
            text=True,
            timeout=60,
            check=True,
        )
    parsed = json.loads(result.stdout)
    return {str(key): bool(value) for key, value in parsed.items()}

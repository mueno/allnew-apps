"""Rules for the public static site.

Internal drafts stay in the git tree under ``internal/`` and are omitted from
``dist/``. Vercel publishes ``dist/`` (see ``vercel.json``). The same path
rules are mirrored in ``vercel.json`` routes so a file that slips back into
the output still responds 404 with ``X-Robots-Tag: noindex``.
"""

from __future__ import annotations

import os
import posixpath
import shutil
import urllib.parse
from collections.abc import Iterator
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"

# Only this landing-automation file is referenced by the public catalog.
PUBLIC_LANDING_RUNTIME = "landing-automation/runtime/landing-runtime.js"

# Directories that are never part of the public site.
EXCLUDED_DIR_NAMES = {
    ".git",
    ".github",
    ".planning",
    ".pytest_cache",
    ".vercel",
    ".wrangler",
    "__pycache__",
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

# PCRE-style sources copied into vercel.json ``routes``.
# ``re.search`` against the URL path is the intended match.
BLOCK_ROUTE_SOURCES = (
    "(?i)/.*\\.md$",
    "(?i)/internal(/.*)?$",
    "(?i)/\\.planning(/.*)?$",
    "(?i)/test-results(/.*)?$",
    "(?i)/scripts(/.*)?$",
    "(?i)/landing-automation/(?!runtime/landing-runtime\\.js$).*$",
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

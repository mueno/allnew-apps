"""functions/_middleware.js must block exactly what the Vercel build drops.

Cloudflare Pages serves the repository tree (not the filtered dist/), so the
Pages Function is the host-side mechanism that returns a real 404 for internal,
excluded and attack paths. These tests run the middleware's own ``isBlockedPath``
through node so the Cloudflare block list cannot silently drift from the
Python/Vercel block list. They skip when node is unavailable (e.g. a
Python-only CI job); tests/test_public_exposure.py covers the file statically.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from public_surface import (
    ATTACK_PROBE_PATHS,
    PUBLIC_LANDING_RUNTIME,
    PUBLIC_PATHS,
    REMOVED_PUBLIC_PATHS,
    is_blocked_path,
    node_executable,
    run_middleware_matcher,
)

requires_node = pytest.mark.skipif(
    node_executable() is None, reason="node is required to execute the Pages Function"
)


@pytest.fixture(scope="module")
def verdicts() -> dict[str, bool]:
    paths = (
        list(REMOVED_PUBLIC_PATHS)
        + list(ATTACK_PROBE_PATHS)
        + list(PUBLIC_PATHS)
        + ["/" + PUBLIC_LANDING_RUNTIME]
    )
    result = run_middleware_matcher(paths)
    assert result is not None
    return result


@requires_node
@pytest.mark.parametrize("path", REMOVED_PUBLIC_PATHS)
def test_middleware_blocks_internal_and_excluded(path: str, verdicts: dict[str, bool]) -> None:
    assert verdicts[path] is True


@requires_node
@pytest.mark.parametrize("path", ATTACK_PROBE_PATHS)
def test_middleware_blocks_attack_probes(path: str, verdicts: dict[str, bool]) -> None:
    assert verdicts[path] is True


@requires_node
@pytest.mark.parametrize("path", PUBLIC_PATHS)
def test_middleware_serves_public_paths(path: str, verdicts: dict[str, bool]) -> None:
    assert verdicts[path] is False


@requires_node
def test_landing_runtime_is_allowlisted(verdicts: dict[str, bool]) -> None:
    assert verdicts["/" + PUBLIC_LANDING_RUNTIME] is False


@requires_node
def test_middleware_matches_python_block_list(verdicts: dict[str, bool]) -> None:
    # The Cloudflare and Vercel/Python block lists must agree on every shared
    # path. Attack probes are excluded: Vercel 404s them by absence, so the
    # Python list intentionally does not cover them.
    for path in list(REMOVED_PUBLIC_PATHS) + list(PUBLIC_PATHS):
        assert verdicts[path] == is_blocked_path(path), path

"""Static anti-regression checks for every production landing route."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = ROOT / ".github" / "workflows"


def _workflow(name: str) -> str:
    return (WORKFLOWS / name).read_text(encoding="utf-8")


def test_direct_deploy_runs_repo_gate_and_live_readback_before_completion() -> None:
    text = _workflow("deploy.yml")
    gate = text.index("landing-automation/scripts/landing_sync.py")
    deploy = text.index("vercel deploy --prod")
    readback = text.index("landing-automation/scripts/landing_live_verify.py")

    assert gate < deploy < readback


def test_bootstrap_cannot_skip_landing_sync_or_live_readback() -> None:
    text = _workflow("landing-auto-update.yml")
    sync_block = text.split("- name: Landing sync", 1)[1].split("- name: Commit changes", 1)[0]
    live_block = text.split("- name: Live verification", 1)[1].split("- name: ANDON", 1)[0]

    assert "if:" not in sync_block
    assert "steps.landing-sync.outcome == 'success'" in live_block


def test_dispatch_requires_readiness_validation() -> None:
    text = _workflow("reusable-landing-sync.yml")
    dispatch = text.split("\n  dispatch:\n", 1)[1]

    assert "needs: validate" in dispatch
    assert "repo scope" not in text


def test_published_artifact_changes_trigger_gate_ci() -> None:
    text = _workflow("landing-tests.yml")

    assert text.count('"data/**"') == 2
    assert text.count('"index.html"') == 2


def test_live_readback_refetches_store_grounding() -> None:
    for name in ("deploy.yml", "landing-auto-update.yml"):
        text = _workflow(name)
        blocks = text.split("landing_live_verify.py", 1)
        assert len(blocks) == 2
        assert "--lookup-file" not in blocks[1].split("\n      - name:", 1)[0]


def test_deadman_opens_andon_and_preserves_failure() -> None:
    text = _workflow("landing-deadman.yml")
    assert "landing_deadman.py" in text
    assert "gh issue create" in text
    assert "run: exit 1" in text


def test_vercel_upload_excludes_control_plane() -> None:
    ignored = (ROOT / ".vercelignore").read_text(encoding="utf-8")
    assert "landing-automation/" in ignored
    assert ".planning/" in ignored

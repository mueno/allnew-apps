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
    assert "id: landing-sync" in text
    assert "id: live-verify" in text
    assert "landing_sync.py --no-record" in text
    assert 'test -z "$(git status --porcelain' in text


def test_bootstrap_cannot_skip_landing_sync_or_live_readback() -> None:
    text = _workflow("landing-auto-update.yml")
    sync_block = text.split("- name: Landing sync", 1)[1].split("- name: Commit changes", 1)[0]
    live_block = text.split("- name: Live verification", 1)[1].split("- name: ANDON", 1)[0]

    assert "if:" not in sync_block
    assert "steps.landing-sync.outcome == 'success'" in live_block


def test_reusable_readiness_has_no_cross_repository_dispatch_credential() -> None:
    text = _workflow("reusable-landing-sync.yml")

    assert "Validate app readiness" in text
    assert 'test "${APP_ACTION}" = "validate"' in text
    assert "dispatch_token" not in text
    assert "Send repository_dispatch" not in text


def test_landing_tests_expose_an_unfiltered_required_release_gate() -> None:
    text = _workflow("landing-tests.yml")

    assert "paths:" not in text
    assert "landing-release-gate:" in text
    assert "landing_sync.py --no-record" in text
    assert "git diff --exit-code -- index.html data/landing-apps.generated.json" in text
    assert "git ls-files --others --exclude-standard" in text


def test_live_readback_refetches_store_grounding() -> None:
    for name in ("deploy.yml", "landing-auto-update.yml"):
        text = _workflow(name)
        blocks = text.split("landing_live_verify.py", 1)
        assert len(blocks) == 2
        assert "--lookup-file" not in blocks[1].split("\n      - name:", 1)[0]


def test_deadman_opens_andon_and_preserves_failure() -> None:
    text = _workflow("landing-deadman.yml")
    assert "landing_deadman.py" in text
    assert 'gh issue create --title "$title" --body "$body"' in text
    assert "PROOF: landing dead-man stale-run" in text
    assert "Read back and close proof issue" in text
    assert "--label andon" not in text
    assert "run: exit 1" in text


def test_vercel_upload_excludes_control_plane() -> None:
    ignored = (ROOT / ".vercelignore").read_text(encoding="utf-8")
    assert "landing-automation/" in ignored
    assert ".planning/" in ignored


def test_no_workflow_can_enable_unsealed_lookup_fixtures() -> None:
    forbidden = "--allow-unsealed-lookup-fixture"

    for workflow in WORKFLOWS.glob("*.yml"):
        assert forbidden not in workflow.read_text(encoding="utf-8"), workflow.name

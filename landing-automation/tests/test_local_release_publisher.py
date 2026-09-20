from __future__ import annotations

import copy
import subprocess
from pathlib import Path

import pytest

import local_release_publisher as pub

HEAD = "a" * 40
BASE = "b" * 40


def inputs():
    pr = {"state": "open", "draft": False,
          "head": {"sha": HEAD, "repo": {"full_name": pub.REPO}},
          "base": {"sha": BASE, "ref": "main", "repo": {"full_name": pub.REPO}}}
    workflows = {"total_count": 1, "workflows": [
        {"path": pub.WORKFLOW, "state": "disabled_manually"}]}
    protection = {"strict": True, "contexts": [pub.CONTEXT],
                  "checks": [{"context": pub.CONTEXT, "app_id": None}]}
    return pr, BASE, workflows, protection, {"build_type": "workflow"}, HEAD


@pytest.mark.parametrize("change", ["head", "base", "closed", "draft", "fork", "target",
                                         "workflow", "partial", "app", "context", "strict", "pages"])
def test_live_contract_fails_closed(change):
    args = list(copy.deepcopy(inputs()))
    pr, _, workflows, protection, pages, _ = args
    if change in ("head", "base"):
        pr[change]["sha"] = "c" * 40
    elif change == "closed":
        pr["state"] = "closed"
    elif change == "draft":
        pr["draft"] = True
    elif change == "fork":
        pr["head"]["repo"]["full_name"] = "attacker/fork"
    elif change == "target":
        pr["base"]["ref"] = "unprotected"
    elif change == "workflow":
        workflows["workflows"][0]["state"] = "active"
    elif change == "partial":
        workflows["total_count"] = 101
    elif change == "app":
        protection["checks"][0]["app_id"] = 15368
    elif change == "context":
        protection["checks"] = []
    elif change == "strict":
        protection["strict"] = False
    elif change == "pages":
        pages["build_type"] = "legacy"
    with pytest.raises(pub.Rejected):
        pub.validate_snapshot(*args)


def test_valid_unpinned_contract_is_supported():
    result = pub.validate_snapshot(*inputs())
    assert (result["head"], result["base"]) == (HEAD, BASE)


@pytest.fixture
def repo(tmp_path):
    root = tmp_path / "repo"
    root.mkdir()
    subprocess.run(["git", "init", "-q", str(root)], check=True)
    (root / "input.txt").write_text("accepted\n")
    subprocess.run(["git", "add", "input.txt"], cwd=root, check=True)
    subprocess.run(["git", "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
                    "-c", "core.hooksPath=/dev/null", "commit", "-qm", "fixture"], cwd=root, check=True)
    return root


@pytest.mark.parametrize("kind", ["tracked", "untracked", "assume-unchanged", "skip-worktree"])
def test_actual_dirty_or_hidden_input_is_rejected(repo, kind):
    pub.assert_clean(repo)
    if kind in ("assume-unchanged", "skip-worktree"):
        subprocess.run(["git", "update-index", "--" + kind, "input.txt"], cwd=repo, check=True)
        (repo / "input.txt").write_text("hidden change")
    else:
        (repo / ("input.txt" if kind == "tracked" else "untracked.txt")).write_text("change")
    with pytest.raises(pub.Rejected):
        pub.assert_clean(repo)


def test_failed_actual_release_command_cannot_produce_success(tmp_path):
    root = tmp_path / "repo"; root.mkdir()
    script = root / "landing-automation/scripts/landing_sync.py"
    script.parent.mkdir(parents=True)
    script.write_text("print('observed failing fixture'); raise SystemExit(23)\n")
    out = tmp_path / "out"; out.mkdir()
    with pytest.raises(pub.Rejected, match="Release command failed"):
        pub.execute_command(root, out, 1, pub.COMMANDS[1])
    assert b"observed failing fixture" in (out / "command-1.log").read_bytes()
    assert not (out / "report.json").exists()


def test_rejected_command_never_executes(tmp_path, monkeypatch):
    monkeypatch.setattr(pub, "run", lambda *a, **kw: pytest.fail("not allowed to execute"))
    with pytest.raises(pub.Rejected, match="allowlist"):
        pub.execute_command(tmp_path, tmp_path, 1, ("sh", "-c", "true"))


def test_untracked_release_artifact_is_not_zero_exit_success(repo, tmp_path):
    (repo / "index.html").write_text("unexpected generated output")
    out = tmp_path / "out"; out.mkdir()
    with pytest.raises(pub.Rejected):
        pub.execute_command(repo, out, 1, pub.COMMANDS[-1])


def harness(monkeypatch, tmp_path):
    root = tmp_path / "repo"; root.mkdir()
    initial = {"base": BASE, "head": HEAD, "pr": 110}
    monkeypatch.setattr(pub, "assert_clean", lambda *_: None)
    monkeypatch.setattr(pub, "assert_source", lambda *_: "source-hash")
    monkeypatch.setattr(pub, "snapshot", lambda *_: copy.deepcopy(initial))
    calls = []

    def command(root, out, i, cmd):
        data = b"actually executed in fixture"
        (out / f"command-{i}.log").write_bytes(data)
        return {"command": list(cmd), "log": f"command-{i}.log", "log_sha256": pub.digest(data)}

    monkeypatch.setattr(pub, "execute_command", command)
    monkeypatch.setattr(pub, "publish_evidence", lambda *args: "https://github.com/mueno/allnew-apps/blob/evidence/report.json")

    def api(root, path, payload=None):
        calls.append((path, payload))
        if payload is not None:
            return {**payload, "id": 7}
        if "/statuses?" in path:
            return [{**next(payload for _, payload in calls if payload), "id": 7}]
        raise AssertionError(path)

    monkeypatch.setattr(pub, "api", api)
    return root, initial, calls


def test_head_or_base_change_after_checks_cannot_publish(monkeypatch, tmp_path):
    root, initial, calls = harness(monkeypatch, tmp_path)
    snapshots = iter([initial, {**initial, "base": "c" * 40}])
    monkeypatch.setattr(pub, "snapshot", lambda *_: next(snapshots))
    with pytest.raises(pub.Rejected, match="changed during"):
        pub.perform(root, tmp_path / "out", 110, HEAD, True)
    assert calls == []


def test_failure_during_command_never_publishes(monkeypatch, tmp_path):
    root, _, calls = harness(monkeypatch, tmp_path)
    def fail(*_):
        raise pub.Rejected("actual command failed")
    monkeypatch.setattr(pub, "execute_command", fail)
    with pytest.raises(pub.Rejected):
        pub.perform(root, tmp_path / "out", 110, HEAD, True)
    assert calls == []


def test_post_status_drift_invalidates_success(monkeypatch, tmp_path):
    root, initial, calls = harness(monkeypatch, tmp_path)
    snapshots = iter([initial] * 4 + [{**initial, "head": "c" * 40}])
    monkeypatch.setattr(pub, "snapshot", lambda *_: next(snapshots))
    with pytest.raises(pub.Rejected, match="after success"):
        pub.perform(root, tmp_path / "out", 110, HEAD, True)
    assert [p["state"] for _, p in calls if p] == ["success", "error"]


def test_success_has_explicit_local_label_and_readback(monkeypatch, tmp_path):
    root, _, calls = harness(monkeypatch, tmp_path)
    result = pub.perform(root, tmp_path / "out", 110, HEAD, True)
    assert result["github_actions_run"] is False
    assert result["reviewed_source_commit"] == HEAD
    assert len(result["commands"]) == len(pub.COMMANDS)
    assert (tmp_path / "out/status-readback.json").exists()
    posted = [p for _, p in calls if p]
    assert len(posted) == 1 and posted[0]["description"].startswith("LOCAL")


def test_evidence_inside_or_existing_output_is_rejected(monkeypatch, tmp_path):
    root, _, calls = harness(monkeypatch, tmp_path)
    with pytest.raises(pub.Rejected):
        pub.perform(root, root / "evidence", 110, HEAD, True)
    out = tmp_path / "used"; out.mkdir()
    with pytest.raises(FileExistsError):
        pub.perform(root, out, 110, HEAD, True)
    assert calls == []


def test_log_tampering_cannot_be_published(tmp_path, monkeypatch):
    (tmp_path / "command-1.log").write_text("tampered")
    report = {"commands": [{"log": "command-1.log", "log_sha256": pub.digest(b"original")}]}
    monkeypatch.setattr(pub, "api", lambda *a, **kw: pytest.fail("must not publish tampered evidence"))
    with pytest.raises(pub.Rejected, match="log changed"):
        pub.publish_evidence(tmp_path, tmp_path, report)

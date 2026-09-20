#!/usr/bin/env python3
"""Execute and publish an honest LOCAL landing-release-gate (never Actions)."""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

REPO = "mueno/allnew-apps"
CONTEXT = "landing-release-gate"
WORKFLOW = ".github/workflows/landing-tests.yml"
WORKFLOW_SHA256 = "01b6347981062401f7db8b5cfbeba5c15bc6d36f2954ca135b665173f42b6491"
SOURCE = "landing-automation/scripts/local_release_publisher.py"
COMMANDS = (
    ("python3", "-m", "pytest", "landing-automation/tests", "-q"),
    ("python3", "landing-automation/scripts/landing_sync.py", "--no-record"),
    ("git", "diff", "--exit-code", "--", "index.html", "data/landing-apps.generated.json"),
    ("git", "ls-files", "--others", "--exclude-standard", "--", "index.html", "data/landing-apps.generated.json"),
)


class Rejected(RuntimeError):
    pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode()


def run(args, root: Path, *, data: bytes | None = None):
    return subprocess.run(args, cwd=root, input=data, capture_output=True, timeout=1200)


def checked(args, root: Path, *, data: bytes | None = None) -> bytes:
    result = run(args, root, data=data)
    if result.returncode:
        raise Rejected(f"Command failed ({result.returncode}): {args!r}: "
                       + result.stderr.decode(errors="replace")[-1200:])
    return result.stdout


def api(root: Path, path: str, payload=None):
    args = ["gh", "api", f"repos/{REPO}/{path}"]
    if payload is not None:
        args += ["--method", "POST", "--input", "-"]
    return json.loads(checked(args, root, data=json_bytes(payload) if payload is not None else None))


def git(root: Path, *args: str) -> str:
    return checked(["git", *args], root).decode().strip()


def assert_clean(root: Path) -> None:
    # Ignore bits can hide modified tracked inputs from status/diff.
    flags = git(root, "ls-files", "-v").splitlines()
    if any(line and (line[0].islower() or line[0] == "S") for line in flags):
        raise Rejected("assume-unchanged/skip-worktree inputs are prohibited")
    if git(root, "status", "--porcelain", "--untracked-files=all"):
        raise Rejected("A clean worktree is required, including untracked files")


def validate_snapshot(pr, base, workflows, protection, pages, head: str) -> dict:
    if pr.get("state") != "open" or pr.get("draft"):
        raise Rejected("PR must be open and ready for review")
    if pr["head"]["repo"]["full_name"] != REPO or pr["base"]["repo"]["full_name"] != REPO:
        raise Rejected("Forks and different repositories are not authorized")
    if pr["base"]["ref"] != "main" or pr["head"]["sha"] != head or pr["base"]["sha"] != base:
        raise Rejected("Stale PR head/base or wrong target branch")
    checks = protection.get("checks", [])
    context = [c for c in checks if c.get("context") == CONTEXT]
    if len(context) != 1 or context[0].get("app_id") not in (None, -1):
        raise Rejected("Required context missing or pinned to an incompatible GitHub App")
    if CONTEXT not in protection.get("contexts", []) or not protection.get("strict"):
        raise Rejected("Expected strict required context contract is absent")
    rows = workflows.get("workflows", [])
    if workflows.get("total_count") != len(rows):
        raise Rejected("Incomplete workflow inventory")
    sources = [w for w in rows if w["path"].startswith(".github/workflows/")]
    if not sources or any(w["state"] not in ("disabled_manually", "disabled_inactivity") for w in sources):
        raise Rejected("All repository Actions workflows must be disabled")
    if not any(w["path"] == WORKFLOW for w in sources):
        raise Rejected("Required workflow absent from remote inventory")
    if pages.get("build_type") != "workflow":
        raise Rejected("Branch-driven Pages deployment is not authorized")
    return {"head": head, "base": base, "workflow_inventory": rows,
            "required_status_checks": protection, "pages_build_type": pages["build_type"]}


def snapshot(root: Path, number: int, head: str) -> dict:
    pr = api(root, f"pulls/{number}")
    base = api(root, "git/ref/heads/main")["object"]["sha"]
    state = validate_snapshot(pr, base, api(root, "actions/workflows?per_page=100"),
                              api(root, "branches/main/protection/required_status_checks"),
                              api(root, "pages"), head)
    checked(["git", "merge-base", "--is-ancestor", base, head], root)
    state["pr"] = number
    return state


def assert_source(root: Path, reviewed: str) -> str:
    if not re.fullmatch(r"[0-9a-f]{40}", reviewed):
        raise Rejected("An exact independently reviewed source commit is required")
    if git(root, "rev-parse", "HEAD") != reviewed:
        raise Rejected("Reviewed source commit must equal tested HEAD")
    if Path(__file__).resolve() != (root / SOURCE).resolve():
        raise Rejected("Execute the publisher from the reviewed worktree")
    if (root / SOURCE).is_symlink():
        raise Rejected("Publisher symlinks are prohibited")
    actual = (root / SOURCE).read_bytes()
    expected = checked(["git", "show", f"{reviewed}:{SOURCE}"], root)
    if actual != expected:
        raise Rejected("Publisher bytes do not match reviewed commit")
    if digest((root / WORKFLOW).read_bytes()) != WORKFLOW_SHA256:
        raise Rejected("Workflow changed: review and update the local command contract")
    origin = git(root, "remote", "get-url", "origin")
    if origin not in (f"git@github.com:{REPO}.git", f"https://github.com/{REPO}.git", f"https://github.com/{REPO}"):
        raise Rejected("Unexpected origin")
    return digest(actual)


def execute_command(root: Path, out: Path, index: int, command: tuple[str, ...]) -> dict:
    if command not in COMMANDS:
        raise Rejected("Command is not in the reviewed fixed allowlist")
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    result = run(list(command), root)
    log = result.stdout + b"\n--- stderr ---\n" + result.stderr
    name = f"command-{index}.log"
    (out / name).write_bytes(log)
    if result.returncode or (command == COMMANDS[-1] and result.stdout.strip()):
        raise Rejected(f"Release command failed: {command!r}; see {name}")
    return {"command": list(command), "started_at": started, "exit_code": result.returncode,
            "log": name, "log_sha256": digest(log), "command_sha256": digest(json_bytes(list(command)))}


def publish_evidence(root: Path, out: Path, report: dict) -> str:
    files = {"report.json": json_bytes(report)}
    files.update({row["log"]: (out / row["log"]).read_bytes() for row in report["commands"]})
    for row in report["commands"]:
        if digest(files[row["log"]]) != row["log_sha256"]:
            raise Rejected("Execution log changed before publication")
    tree = []
    for name, content in files.items():
        blob = api(root, "git/blobs", {"content": base64.b64encode(content).decode(), "encoding": "base64"})
        tree.append({"path": name, "mode": "100644", "type": "blob", "sha": blob["sha"]})
    obj = api(root, "git/trees", {"tree": tree})
    commit = api(root, "git/commits", {"message": f"LOCAL verification for PR #{report['pr']} {report['head']}",
                                      "tree": obj["sha"], "parents": []})
    # Unique evidence-only orphan branch; never changes main or the PR's head.
    ref = f"refs/heads/local-verification/pr-{report['pr']}-{uuid.uuid4().hex}"
    api(root, "git/refs", {"ref": ref, "sha": commit["sha"]})
    if api(root, "git/ref/" + ref.removeprefix("refs/"))["object"]["sha"] != commit["sha"]:
        raise Rejected("Evidence ref read-back mismatch")
    for row in tree:
        remote = api(root, "git/blobs/" + row["sha"])
        if base64.b64decode(remote["content"]) != files[row["path"]]:
            raise Rejected("Published evidence bytes differ")
    receipt = {"evidence_commit": commit["sha"], "evidence_ref": ref,
               "report_sha256": digest(files["report.json"])}
    (out / "evidence-publication.json").write_bytes(json_bytes(receipt))
    return f"https://github.com/{REPO}/blob/{commit['sha']}/report.json"


def perform(root: Path, out: Path, number: int, reviewed: str, publish: bool) -> dict:
    root = root.resolve(); out = out.resolve()
    if out == root or root in out.parents:
        raise Rejected("Evidence output must be outside the clean worktree")
    out.mkdir(parents=True, exist_ok=False)
    assert_clean(root)
    source_hash = assert_source(root, reviewed)
    initial = snapshot(root, number, reviewed)
    commands = [execute_command(root, out, i, cmd) for i, cmd in enumerate(COMMANDS, 1)]
    assert_clean(root)
    if assert_source(root, reviewed) != source_hash or snapshot(root, number, reviewed) != initial:
        raise Rejected("Head/base/source/remote policy changed during verification")
    report = {"schema_version": "allnew-apps.local-release-verification.v1", "runner": "local",
              "github_actions_run": False, "repo": REPO, "pr": number, "head": reviewed,
              "base": initial["base"], "reviewed_source_commit": reviewed, "publisher_sha256": source_hash,
              "authority": "landing-automation/docs/local-release-publisher.md",
              "workflow_sha256": WORKFLOW_SHA256, "commands": commands, "snapshot": initial,
              "verified_at": dt.datetime.now(dt.timezone.utc).isoformat(), "result": "passed"}
    (out / "report.json").write_bytes(json_bytes(report))
    if not publish:
        return report
    # Each mutation follows fresh no-Actions/head/base checks. No report-import mode.
    if snapshot(root, number, reviewed) != initial:
        raise Rejected("Remote state changed before evidence publication")
    url = publish_evidence(root, out, report)
    assert_clean(root)
    assert_source(root, reviewed)
    if snapshot(root, number, reviewed) != initial:
        raise Rejected("Remote state changed before success registration")
    status = api(root, f"statuses/{reviewed}", {"state": "success", "context": CONTEXT,
                 "description": f"LOCAL tests + release gate; base {initial['base'][:10]}; not Actions",
                 "target_url": url})
    (out / "status-response.json").write_bytes(json_bytes(status))
    try:
        rows = api(root, f"commits/{reviewed}/statuses?per_page=100")
        latest = next(s for s in rows if s["context"] == CONTEXT)
        if latest["id"] != status["id"] or latest["state"] != "success" or latest["target_url"] != url:
            raise Rejected("Status read-back mismatch")
        if snapshot(root, number, reviewed) != initial:
            raise Rejected("PR or policy changed after success registration")
    except Exception:
        api(root, f"statuses/{reviewed}", {"state": "error", "context": CONTEXT,
            "description": "LOCAL verification invalidated: remote read-back/state changed", "target_url": url})
        raise
    (out / "status-readback.json").write_bytes(json_bytes(latest))
    return report


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--repo-root", type=Path, default=Path.cwd())
    p.add_argument("--pr", type=int, required=True)
    p.add_argument("--reviewed-source-commit", required=True)
    p.add_argument("--output-dir", type=Path, required=True)
    p.add_argument("--publish", action="store_true")
    args = p.parse_args()
    try:
        result = perform(args.repo_root, args.output_dir, args.pr, args.reviewed_source_commit, args.publish)
        print(json.dumps({"result": result["result"], "head": result["head"], "base": result["base"],
                          "local": True, "published": args.publish}))
        return 0
    except (Rejected, subprocess.SubprocessError, OSError, ValueError, KeyError) as exc:
        print(f"LOCAL verification rejected: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

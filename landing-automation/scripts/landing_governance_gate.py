#!/usr/bin/env python3
"""Executable governance gate for the landing publication loop.

The factory blueprint is policy. This module evaluates its declared autonomy
criteria and first-block escalation before a route can publish. A failed gate
never becomes advisory; the escape valve only routes a human-visible ANDON.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
BLUEPRINT = ROOT / "landing-automation" / "factory" / "blueprint.json"
CATALOG = ROOT / "landing-automation" / "config" / "app_catalog.json"
METRICS = ROOT / "landing-automation" / "state" / "parity_metrics.jsonl"
REPORT = ROOT / "landing-automation" / "state" / "governance-report.json"
WORKFLOW_RUNS_URL = (
    "https://api.github.com/repos/mueno/allnew-apps/actions/workflows/"
    "landing-auto-update.yml/runs?status=completed&per_page=20"
)


def _load_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"expected JSON object: {path}")
    return data


def _parse_time(value: object) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def load_workflow_runs(path: Path | None) -> dict[str, Any]:
    if path is not None:
        return _load_json(path)
    request = urllib.request.Request(
        WORKFLOW_RUNS_URL,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "allnew-landing-governance/1"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:  # noqa: S310 - fixed HTTPS URL
        return json.loads(response.read().decode("utf-8"))


def consecutive_successes(payload: dict[str, Any]) -> int:
    rows = payload.get("workflow_runs")
    if not isinstance(rows, list):
        return 0
    completed = [row for row in rows if isinstance(row, dict) and row.get("status") == "completed"]
    completed.sort(key=lambda row: str(row.get("created_at") or ""), reverse=True)
    count = 0
    for row in completed:
        if row.get("conclusion") != "success":
            break
        count += 1
    return count


def catalog_lineage() -> dict[str, Any]:
    current = _load_json(CATALOG).get("apps")
    if not isinstance(current, list):
        return {"pass": False, "reason": "catalog_apps_invalid", "entries": []}
    auto = [row for row in current if isinstance(row, dict) and row.get("auto_onboarded") is True]
    commits = subprocess.run(
        ["git", "log", "--reverse", "--format=%H", "--", str(CATALOG.relative_to(ROOT))],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if commits.returncode != 0:
        return {"pass": False, "reason": "catalog_git_history_unavailable", "entries": []}

    first_seen: dict[str, dict[str, Any]] = {}
    for commit in [line.strip() for line in commits.stdout.splitlines() if line.strip()]:
        shown = subprocess.run(
            ["git", "show", f"{commit}:{CATALOG.relative_to(ROOT)}"],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
        if shown.returncode != 0:
            continue
        try:
            historical = json.loads(shown.stdout).get("apps", [])
        except (json.JSONDecodeError, AttributeError):
            continue
        for row in historical:
            if not isinstance(row, dict) or row.get("auto_onboarded") is not True:
                continue
            key = str(row.get("asc_app_id") or row.get("bundle_id") or row.get("slug") or "")
            if key and key not in first_seen:
                first_seen[key] = {
                    "commit": commit,
                    "slug": row.get("slug"),
                    "category": row.get("category"),
                }

    evidence: list[dict[str, Any]] = []
    for row in auto:
        key = str(row.get("asc_app_id") or row.get("bundle_id") or row.get("slug") or "")
        initial = first_seen.get(key)
        if initial and initial.get("slug") == row.get("slug") and initial.get("category") == row.get("category"):
            evidence.append({"id": key, **initial})
    return {
        "pass": len(evidence) >= 3,
        "reason": "ok" if len(evidence) >= 3 else "fewer_than_three_preserved_auto_onboarded_entries",
        "entries": evidence,
    }


def precision_window(now: datetime | None = None) -> dict[str, Any]:
    at = now or datetime.now(timezone.utc)
    if not METRICS.is_file():
        return {"pass": False, "reason": "precision_ledger_missing", "run_count": 0}
    start = at - timedelta(days=30)
    run_count = 0
    false_positive_count = 0
    for line in METRICS.read_text(encoding="utf-8").splitlines():
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            return {"pass": False, "reason": "precision_ledger_invalid_json", "run_count": run_count}
        observed = _parse_time(row.get("finished_at"))
        if observed is None or observed < start or observed > at:
            continue
        run_count += 1
        false_positive_count += max(int(row.get("false_positive_count", 0)), 0)
    return {
        "pass": run_count > 0 and false_positive_count < 1,
        "reason": "ok" if run_count > 0 and false_positive_count < 1 else "precision_window_not_satisfied",
        "run_count": run_count,
        "false_positive_count": false_positive_count,
    }


def production_route() -> dict[str, Any]:
    failures: list[str] = []
    for relative in (".github/workflows/deploy.yml", ".github/workflows/landing-auto-update.yml"):
        text = (ROOT / relative).read_text(encoding="utf-8")
        sync_at = text.find("landing_sync.py")
        deploy_match = re.search(r"vercel(?:@[^ ]+)?\s+deploy\s+--prod", text)
        deploy_at = deploy_match.start() if deploy_match else -1
        live_at = text.find("landing_live_verify.py")
        if not (0 <= sync_at < deploy_at < live_at):
            failures.append(relative)
    return {"pass": not failures, "failures": failures}


def autonomy_verdict(workflow_runs: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    successes = consecutive_successes(workflow_runs)
    lineage = catalog_lineage()
    precision = precision_window()
    route = production_route()
    evidence = {
        "consecutive_successful_runs": successes,
        "catalog_lineage": lineage,
        "precision_window": precision,
        "production_route": route,
    }
    return successes >= 10 and lineage["pass"] and precision["pass"] and route["pass"], evidence


def block_report(failed_gate: str) -> dict[str, Any]:
    blueprint = _load_json(BLUEPRINT)
    gates = {str(row.get("id")): row for row in blueprint.get("gates", []) if isinstance(row, dict)}
    gate = gates.get(failed_gate)
    if gate is None:
        return {
            "schema_version": 1,
            "verdict": "block",
            "failed_gate": failed_gate,
            "errors": ["failed_gate_not_declared"],
            "escalation_required": True,
        }
    valve = gate.get("escape_valve") if isinstance(gate.get("escape_valve"), dict) else {}
    threshold = int(valve.get("max_consecutive_blocks", 0))
    return {
        "schema_version": 1,
        "verdict": "block",
        "failed_gate": failed_gate,
        "consecutive_blocks": 1,
        "max_consecutive_blocks": threshold,
        "on_exhaust": valve.get("on_exhaust"),
        "escalation_required": threshold == 1 and valve.get("on_exhaust") == "escalate_human",
        "forward_ops_allowed": False,
    }


def write_report(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("pre-publish", "block"), required=True)
    parser.add_argument("--workflow-runs", type=Path)
    parser.add_argument("--failed-gate")
    parser.add_argument("--report", type=Path, default=REPORT)
    args = parser.parse_args()

    if args.stage == "block":
        if not args.failed_gate:
            parser.error("--failed-gate is required for --stage block")
        report = block_report(args.failed_gate)
        write_report(report, args.report)
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        return 1

    try:
        workflow_runs = load_workflow_runs(args.workflow_runs)
        passed, evidence = autonomy_verdict(workflow_runs)
        report = {
            "schema_version": 1,
            "verdict": "pass" if passed else "block",
            "autonomy_tier": "L3",
            "evidence": evidence,
            "forward_ops_allowed": passed,
        }
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        report = {
            "schema_version": 1,
            "verdict": "block",
            "autonomy_tier": "L3",
            "errors": [f"governance_evidence_unavailable:{type(exc).__name__}"],
            "forward_ops_allowed": False,
        }
        passed = False
    write_report(report, args.report)
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())

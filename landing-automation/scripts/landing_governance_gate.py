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
WORKFLOW_JOBS_URL = "https://api.github.com/repos/mueno/allnew-apps/actions/runs/{run_id}/jobs?per_page=100"
PRECISION_WINDOW_DAYS = 30
MIN_PRECISION_RUNS = 10
MIN_PRECISION_ELAPSED = timedelta(hours=72)
PRODUCTION_EVENTS = frozenset({"schedule", "repository_dispatch", "workflow_dispatch"})


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
        payload = json.loads(response.read().decode("utf-8"))
    rows = payload.get("workflow_runs") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        return payload
    for row in rows:
        if not isinstance(row, dict) or row.get("status") != "completed" or row.get("conclusion") == "success":
            continue
        run_id = str(row.get("id") or "")
        if not re.fullmatch(r"[1-9][0-9]*", run_id):
            continue
        jobs_request = urllib.request.Request(
            WORKFLOW_JOBS_URL.format(run_id=run_id),
            headers={"Accept": "application/vnd.github+json", "User-Agent": "allnew-landing-governance/1"},
        )
        try:
            with urllib.request.urlopen(jobs_request, timeout=20) as response:  # noqa: S310 - fixed HTTPS URL
                jobs_payload = json.loads(response.read().decode("utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        jobs = jobs_payload.get("jobs") if isinstance(jobs_payload, dict) else None
        steps = [
            step
            for job in jobs if isinstance(jobs, list) and isinstance(job, dict)
            for step in job.get("steps", [])
            if isinstance(step, dict)
        ] if isinstance(jobs, list) else []
        deployment = next(
            (step for step in steps if step.get("name") == "Deploy to Vercel (production)"),
            None,
        )
        row["preproduction_block"] = bool(
            isinstance(deployment, dict)
            and deployment.get("status") == "completed"
            and deployment.get("conclusion") == "skipped"
        )
    return payload


def consecutive_successes(payload: dict[str, Any]) -> int:
    rows = payload.get("workflow_runs")
    if not isinstance(rows, list):
        return 0
    completed = [row for row in rows if isinstance(row, dict) and row.get("status") == "completed"]
    completed.sort(key=lambda row: str(row.get("created_at") or ""), reverse=True)
    count = 0
    for row in completed:
        if row.get("conclusion") == "success":
            count += 1
            continue
        if row.get("preproduction_block") is True:
            continue
        if row.get("conclusion") != "success":
            break
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


def _production_runs(payload: dict[str, Any], *, start: datetime, end: datetime) -> list[dict[str, Any]]:
    rows = payload.get("workflow_runs")
    if not isinstance(rows, list):
        return []
    observed: dict[str, dict[str, Any]] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        run_id = str(row.get("id") or "")
        created_at = _parse_time(row.get("created_at"))
        if (
            not re.fullmatch(r"[1-9][0-9]*", run_id)
            or created_at is None
            or created_at < start
            or created_at > end
            or row.get("status") != "completed"
            or row.get("conclusion") != "success"
            or row.get("head_branch") != "main"
            or row.get("event") not in PRODUCTION_EVENTS
        ):
            continue
        observed[run_id] = {**row, "run_id": run_id, "observed_at": created_at}
    return sorted(observed.values(), key=lambda row: row["observed_at"])


def _metric_row_errors(row: dict[str, Any], production_run_ids: set[str]) -> list[str]:
    errors: list[str] = []
    run_id = str(row.get("run_id") or "")
    if row.get("schema_version") != 2:
        errors.append("schema_version_invalid")
    if not re.fullmatch(r"[1-9][0-9]*", run_id) or run_id not in production_run_ids:
        errors.append("run_id_not_bound_to_production")
    if row.get("provider") != "github-actions" or row.get("repository") != "mueno/allnew-apps":
        errors.append("provider_identity_invalid")
    workflow_ref = str(row.get("workflow_ref") or "")
    if ".github/workflows/landing-auto-update.yml@refs/heads/main" not in workflow_ref:
        errors.append("workflow_ref_invalid")
    if row.get("ref") != "refs/heads/main" or row.get("event_name") not in PRODUCTION_EVENTS:
        errors.append("production_context_invalid")
    if not isinstance(row.get("run_attempt"), int) or row["run_attempt"] < 1:
        errors.append("run_attempt_invalid")
    if not re.fullmatch(r"[0-9a-f]{40}", str(row.get("head_sha") or "")):
        errors.append("head_sha_invalid")
    return errors


def precision_window(workflow_runs: dict[str, Any], now: datetime | None = None) -> dict[str, Any]:
    at = now or datetime.now(timezone.utc)
    start = at - timedelta(days=PRECISION_WINDOW_DAYS)
    production_runs = _production_runs(workflow_runs, start=start, end=at)
    production_run_ids = {row["run_id"] for row in production_runs}
    run_count = len(production_runs)
    elapsed = (
        production_runs[-1]["observed_at"] - production_runs[0]["observed_at"]
        if len(production_runs) >= 2
        else timedelta(0)
    )
    false_positive_count = 0
    metric_run_ids: set[str] = set()
    if METRICS.is_file():
        for line_number, line in enumerate(METRICS.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                return {
                    "pass": False,
                    "reason": "precision_ledger_invalid_json",
                    "run_count": run_count,
                    "invalid_line": line_number,
                }
            if not isinstance(row, dict):
                return {"pass": False, "reason": "precision_ledger_row_invalid", "run_count": run_count}
            row_errors = _metric_row_errors(row, production_run_ids)
            run_id = str(row.get("run_id") or "")
            if run_id in metric_run_ids:
                row_errors.append("duplicate_run_id")
            metric_run_ids.add(run_id)
            if row_errors:
                return {
                    "pass": False,
                    "reason": "precision_ledger_unbound_row",
                    "run_count": run_count,
                    "invalid_line": line_number,
                    "row_errors": sorted(set(row_errors)),
                }
            false_positive_count += max(int(row.get("false_positive_count", 0)), 0)
    enough_runs = run_count >= MIN_PRECISION_RUNS
    enough_elapsed = elapsed >= MIN_PRECISION_ELAPSED
    passed = enough_runs and enough_elapsed and false_positive_count < 1
    return {
        "pass": passed,
        "reason": "ok" if passed else "precision_window_not_satisfied",
        "window_days": PRECISION_WINDOW_DAYS,
        "minimum_run_count": MIN_PRECISION_RUNS,
        "minimum_elapsed_hours": int(MIN_PRECISION_ELAPSED.total_seconds() // 3600),
        "run_count": run_count,
        "elapsed_hours": int(elapsed.total_seconds() // 3600),
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
    precision = precision_window(workflow_runs)
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

#!/usr/bin/env python3
"""Fail-closed parity gate: every publicly released AllNew app must be on the LP.

External grounding signal: the iTunes Lookup artist listing (what the world can
actually see on the App Store), never internal state or self-reported events.

Verdict rules:
  - Every public app id must appear in data/landing-apps.generated.json with
    status "released" and an app_store_url — unless explicitly excluded in
    config/parity_exclusions.json (each exclusion requires a reason).
  - A missing app is a BLOCK: exit 1 so CI turns red and the ANDON issue opens.
    Warnings (stale LP entries no longer public, enrichment backlog) never block.

Escape valve (circuit breaker): state/parity_circuit_breaker.json with an
expires_at timestamp downgrades BLOCK to WARN until it expires. Use only while
a confirmed false positive is being fixed; the report records its use.

Exit codes: 0 = parity OK, 1 = parity violation (fail closed), 2 = config error.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import store_discovery
import update_landing_data as uld

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "landing-automation" / "config" / "app_catalog.json"
OUTPUT_PATH = ROOT / "data" / "landing-apps.generated.json"
EXCLUSIONS_PATH = ROOT / "landing-automation" / "config" / "parity_exclusions.json"
CIRCUIT_BREAKER_PATH = ROOT / "landing-automation" / "state" / "parity_circuit_breaker.json"
CIRCUIT_BREAKER_LEDGER_PATH = (
    ROOT / "landing-automation" / "state" / "parity_circuit_breaker_ledger.json"
)
REPORT_PATH = ROOT / "landing-automation" / "state" / "parity_report.json"
METRICS_LEDGER_PATH = ROOT / "landing-automation" / "state" / "parity_metrics.jsonl"
MAX_BREAKER_DURATION = timedelta(hours=72)
MAX_BREAKER_CUMULATIVE_30D = timedelta(hours=144)
BREAKER_WINDOW = timedelta(days=30)
ANDON_ISSUE_RE = re.compile(r"^https://github\.com/[^/]+/[^/]+/issues/[1-9][0-9]*$")
STALE_GRACE_PERIOD = timedelta(days=7)
METRICS_WINDOW = timedelta(days=30)
PRODUCTION_REPOSITORY = "mueno/allnew-apps"
PRODUCTION_WORKFLOW_MARKER = ".github/workflows/landing-auto-update.yml@refs/heads/main"
PRODUCTION_EVENTS = frozenset({"schedule", "repository_dispatch", "workflow_dispatch"})


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def load_exclusions(path: Path) -> dict[str, dict[str, Any]]:
    payload = uld.load_json(path, {"exclusions": []})
    exclusions: dict[str, dict[str, Any]] = {}
    for item in payload.get("exclusions", []):
        if not isinstance(item, dict):
            continue
        app_id = str(item.get("app_id") or "")
        reason = str(item.get("reason") or "").strip()
        owner = str(item.get("owner") or "").strip()
        expires_at = uld.parse_iso_datetime(item.get("expires_at"))
        review_by = uld.parse_iso_datetime(item.get("review_by"))
        if not app_id or not reason or not owner or expires_at is None or review_by is None:
            raise ValueError(
                "parity_exclusions.json entries require app_id, reason, owner, expires_at, and review_by"
            )
        if expires_at <= now_utc():
            raise ValueError(f"parity exclusion {app_id} has expired")
        if review_by > expires_at:
            raise ValueError(f"parity exclusion {app_id} review_by must not be after expires_at")
        exclusions[app_id] = item
    return exclusions


def _breaker_decision(
    path: Path,
    ledger_path: Path | None = None,
    *,
    at: datetime | None = None,
) -> dict[str, Any]:
    """Validate the temporary escape valve and its append-only usage ledger.

    Invalid or unaccounted breaker state is never active.  The caller therefore
    returns to the ordinary fail-closed parity verdict instead of converting a
    malformed exception into authorization.
    """

    payload = uld.load_json(path, None)
    if not isinstance(payload, dict):
        return {"active": False, "reason": "", "errors": []}

    required = ("entry_id", "opened_at", "expires_at", "opened_by", "andon_issue", "reason")
    errors = [f"circuit_breaker_{field}_missing" for field in required if not str(payload.get(field) or "").strip()]
    opened_at = uld.parse_iso_datetime(payload.get("opened_at"))
    expires_at = uld.parse_iso_datetime(payload.get("expires_at"))
    if opened_at is None:
        errors.append("circuit_breaker_opened_at_invalid")
    if expires_at is None:
        errors.append("circuit_breaker_expires_at_invalid")
    if opened_at is not None and expires_at is not None:
        duration = expires_at - opened_at
        if duration <= timedelta(0):
            errors.append("circuit_breaker_duration_invalid")
        elif duration > MAX_BREAKER_DURATION:
            errors.append("circuit_breaker_duration_exceeds_72_hours")
    if not ANDON_ISSUE_RE.fullmatch(str(payload.get("andon_issue") or "")):
        errors.append("circuit_breaker_andon_issue_invalid")

    ledger_path = ledger_path or path.with_name("parity_circuit_breaker_ledger.json")
    ledger = uld.load_json(ledger_path, None)
    entries = ledger.get("entries") if isinstance(ledger, dict) else None
    if not isinstance(entries, list):
        errors.append("circuit_breaker_ledger_missing_or_invalid")
        entries = []

    entry_id = str(payload.get("entry_id") or "")
    matching = [entry for entry in entries if isinstance(entry, dict) and str(entry.get("entry_id") or "") == entry_id]
    if len(matching) != 1:
        errors.append("circuit_breaker_ledger_entry_missing_or_duplicate")
    elif any(matching[0].get(field) != payload.get(field) for field in required):
        errors.append("circuit_breaker_ledger_entry_mismatch")

    current = at or now_utc()
    window_start = current - BREAKER_WINDOW
    cumulative = timedelta(0)
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            errors.append(f"circuit_breaker_ledger_entry_{index}_invalid")
            continue
        start = uld.parse_iso_datetime(entry.get("opened_at"))
        end = uld.parse_iso_datetime(entry.get("expires_at"))
        if start is None or end is None or end <= start:
            errors.append(f"circuit_breaker_ledger_entry_{index}_time_invalid")
            continue
        clipped_start = max(start, window_start)
        clipped_end = min(end, current)
        if clipped_end > clipped_start:
            cumulative += clipped_end - clipped_start
    if cumulative > MAX_BREAKER_CUMULATIVE_30D:
        errors.append("circuit_breaker_30_day_cumulative_limit_exceeded")

    reason = str(payload.get("reason") or "")
    return {
        "active": not errors and expires_at is not None and expires_at > current,
        "reason": reason if not errors else "",
        "errors": sorted(set(errors)),
        "cumulative_seconds_30d": int(cumulative.total_seconds()),
    }


def circuit_breaker_active(
    path: Path,
    ledger_path: Path | None = None,
    *,
    at: datetime | None = None,
) -> tuple[bool, str]:
    decision = _breaker_decision(path, ledger_path, at=at)
    return bool(decision["active"]), str(decision["reason"])


def evaluate_parity(
    lookup: dict[str, dict[str, dict[str, Any]]],
    generated: dict[str, Any],
    catalog: dict[str, Any],
    exclusions: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Pure comparison of ground truth vs landing data. Returns a report dict."""
    public_ids = set(lookup.get("jp", {})) | set(lookup.get("us", {}))

    lp_by_app_id: dict[str, dict[str, Any]] = {}
    for entry in generated.get("apps", []):
        if isinstance(entry, dict) and entry.get("asc_app_id"):
            lp_by_app_id[str(entry["asc_app_id"])] = entry

    catalog_ids = {
        str(app.get("asc_app_id"))
        for app in catalog.get("apps", [])
        if app.get("asc_app_id")
    }

    missing: list[dict[str, Any]] = []
    excluded: list[str] = []
    for app_id in sorted(public_ids):
        if app_id in exclusions:
            excluded.append(app_id)
            continue
        track = lookup.get("jp", {}).get(app_id) or lookup.get("us", {}).get(app_id) or {}
        lp_entry = lp_by_app_id.get(app_id)
        problems: list[str] = []
        if app_id not in catalog_ids:
            problems.append("not in app_catalog.json")
        if lp_entry is None:
            problems.append("not in landing-apps.generated.json")
        else:
            if lp_entry.get("status") != "released":
                problems.append(f"status={lp_entry.get('status')} (expected released)")
            if not lp_entry.get("app_store_url"):
                problems.append("app_store_url missing")
        if problems:
            missing.append(
                {
                    "app_id": app_id,
                    "name": str(track.get("trackName") or ""),
                    "problems": problems,
                }
            )

    stale = sorted(
        app_id
        for app_id, entry in lp_by_app_id.items()
        if app_id not in public_ids and entry.get("status") == "released"
    )

    enrichment = sorted(
        str(app.get("slug"))
        for app in catalog.get("apps", [])
        if app.get("auto_onboarded")
    )

    # Guard-precision signal: exclusions marked false_positive=true record
    # confirmed over-blocks of this gate (pillar A of the factory invariants).
    false_positive_ids = sorted(
        app_id
        for app_id, item in exclusions.items()
        if uld.as_bool(item.get("false_positive"), default=False)
    )

    return {
        "public_apps": len(public_ids),
        "landing_released": sum(
            1 for entry in lp_by_app_id.values() if entry.get("status") == "released"
        ),
        "missing": missing,
        "excluded_app_ids": excluded,
        "false_positive_exclusion_ids": false_positive_ids,
        "stale_landing_app_ids": stale,
        "enrichment_backlog": enrichment,
    }


def classify_stale_apps(
    stale_app_ids: list[str],
    previous_report: dict[str, Any],
    *,
    at: datetime | None = None,
) -> tuple[dict[str, str], list[str]]:
    """Track first observation and block stale public cards after seven days."""

    current = at or now_utc()
    previous = previous_report.get("stale_first_seen")
    if not isinstance(previous, dict):
        previous = {}
    first_seen: dict[str, str] = {}
    expired: list[str] = []
    for app_id in stale_app_ids:
        parsed = uld.parse_iso_datetime(previous.get(app_id))
        observed = parsed or current
        first_seen[app_id] = observed.replace(microsecond=0).isoformat()
        if current - observed > STALE_GRACE_PERIOD:
            expired.append(app_id)
    return first_seen, sorted(expired)


def append_metrics(
    path: Path,
    *,
    run_identity: dict[str, Any],
    started_at: datetime,
    finished_at: datetime,
    verdict: str,
    report: dict[str, Any],
) -> dict[str, Any]:
    """Append one immutable run observation and calculate 30-day precision."""

    false_positive_count = len(report.get("false_positive_exclusion_ids", []))
    block_count = len(report.get("missing", [])) + len(report.get("expired_stale_app_ids", []))
    true_positive_count = max(block_count - false_positive_count, 0)
    entry = {
        "schema_version": 2,
        **run_identity,
        "started_at": started_at.replace(microsecond=0).isoformat(),
        "finished_at": finished_at.replace(microsecond=0).isoformat(),
        "verdict": verdict,
        "block_count": block_count,
        "true_positive_count": true_positive_count,
        "false_positive_count": false_positive_count,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=True, sort_keys=True) + "\n")

    window_start = finished_at - METRICS_WINDOW
    tp = 0
    fp = 0
    run_count = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        try:
            item = json.loads(line)
            observed = uld.parse_iso_datetime(item.get("finished_at"))
        except (json.JSONDecodeError, AttributeError):
            continue
        if observed is None or observed < window_start or observed > finished_at:
            continue
        run_count += 1
        tp += max(int(item.get("true_positive_count", 0)), 0)
        fp += max(int(item.get("false_positive_count", 0)), 0)
    denominator = tp + fp
    return {
        "window_days": 30,
        "run_count": run_count,
        "true_positive_count": tp,
        "false_positive_count": fp,
        "precision": (tp / denominator) if denominator else None,
        "false_positives_per_30_days": fp,
    }


def production_run_identity(environment: dict[str, str] | None = None) -> tuple[dict[str, Any], list[str]]:
    env = environment or dict(os.environ)
    run_id = str(env.get("GITHUB_RUN_ID") or "")
    run_attempt = str(env.get("GITHUB_RUN_ATTEMPT") or "")
    repository = str(env.get("GITHUB_REPOSITORY") or "")
    workflow_ref = str(env.get("GITHUB_WORKFLOW_REF") or "")
    event_name = str(env.get("GITHUB_EVENT_NAME") or "")
    ref = str(env.get("GITHUB_REF") or "")
    head_sha = str(env.get("GITHUB_SHA") or "")
    errors: list[str] = []
    if env.get("GITHUB_ACTIONS") != "true":
        errors.append("not_github_actions")
    if not re.fullmatch(r"[1-9][0-9]*", run_id):
        errors.append("run_id_invalid")
    if not re.fullmatch(r"[1-9][0-9]*", run_attempt):
        errors.append("run_attempt_invalid")
    if repository != PRODUCTION_REPOSITORY:
        errors.append("repository_invalid")
    if PRODUCTION_WORKFLOW_MARKER not in workflow_ref:
        errors.append("workflow_ref_invalid")
    if event_name not in PRODUCTION_EVENTS or ref != "refs/heads/main":
        errors.append("production_context_invalid")
    if not re.fullmatch(r"[0-9a-f]{40}", head_sha):
        errors.append("head_sha_invalid")
    if errors:
        return {}, sorted(set(errors))
    return {
        "provider": "github-actions",
        "run_id": run_id,
        "run_attempt": int(run_attempt),
        "repository": repository,
        "workflow_ref": workflow_ref,
        "event_name": event_name,
        "ref": ref,
        "head_sha": head_sha,
    }, []


def write_report(
    path: Path,
    report: dict[str, Any],
    verdict: str,
    breaker_reason: str,
    breaker_errors: list[str] | None = None,
    metrics: dict[str, Any] | None = None,
) -> None:
    previous = uld.load_json(path, {})
    payload = {
        "schema_version": 1,
        "verdict": verdict,
        "circuit_breaker": breaker_reason or None,
        "circuit_breaker_errors": breaker_errors or [],
        "guard_precision_30d": metrics or {},
        "updated_at": now_utc().replace(microsecond=0).isoformat(),
        **report,
    }
    comparable_prev = {k: v for k, v in previous.items() if k != "updated_at"}
    comparable_next = {k: v for k, v in payload.items() if k != "updated_at"}
    if comparable_prev == comparable_next and previous.get("updated_at"):
        payload["updated_at"] = previous["updated_at"]
    uld.save_json_if_changed(path, payload)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Landing/App Store parity gate (fail-closed)")
    parser.add_argument("--catalog", type=Path, default=CATALOG_PATH)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--exclusions", type=Path, default=EXCLUSIONS_PATH)
    parser.add_argument("--circuit-breaker", type=Path, default=CIRCUIT_BREAKER_PATH)
    parser.add_argument(
        "--circuit-breaker-ledger",
        type=Path,
        default=CIRCUIT_BREAKER_LEDGER_PATH,
    )
    parser.add_argument("--report", type=Path, default=REPORT_PATH)
    parser.add_argument("--metrics-ledger", type=Path, default=METRICS_LEDGER_PATH)
    record_mode = parser.add_mutually_exclusive_group()
    record_mode.add_argument(
        "--record-ci-observation",
        action="store_true",
        help="Persist an observation only when bound to the production GitHub Actions run",
    )
    record_mode.add_argument(
        "--no-record",
        action="store_true",
        help="Deprecated compatibility flag; evaluation is non-mutating by default",
    )
    parser.add_argument("--artist-id", default=None)
    parser.add_argument(
        "--lookup-file",
        type=Path,
        default=None,
        help="Pre-fetched lookup payload (from store_discovery --lookup-cache)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    started_at = now_utc()

    catalog = uld.load_json(args.catalog, {})
    generated = uld.load_json(args.output, {})
    if not catalog.get("apps"):
        print(f"[GATE:ERROR] catalog missing or empty: {args.catalog}")
        return 2
    try:
        exclusions = load_exclusions(args.exclusions)
    except ValueError as error:
        print(f"[GATE:ERROR] {error}")
        return 2

    if args.lookup_file:
        try:
            lookup = store_discovery.load_lookup_cache(args.lookup_file)
        except ValueError as error:
            print(f"[GATE:ERROR] {error}")
            return 2
    else:
        artist_id = str(args.artist_id or catalog.get("artist_id") or "")
        if not artist_id:
            print("[GATE:ERROR] artist_id missing (catalog top-level or --artist-id)")
            return 2
        lookup = store_discovery.fetch_artist_lookup(artist_id)

    if not (set(lookup.get("jp", {})) | set(lookup.get("us", {}))):
        # Fail closed: an empty ground truth is indistinguishable from a broken signal.
        print("[GATE:BLOCK] artist lookup returned zero public apps")
        return 1

    report = evaluate_parity(lookup, generated, catalog, exclusions)
    previous_report = uld.load_json(args.report, {})
    stale_first_seen, expired_stale = classify_stale_apps(
        report["stale_landing_app_ids"], previous_report
    )
    report["stale_first_seen"] = stale_first_seen
    report["expired_stale_app_ids"] = expired_stale
    breaker = _breaker_decision(args.circuit_breaker, args.circuit_breaker_ledger)
    breaker_active = bool(breaker["active"])
    breaker_reason = str(breaker["reason"])
    for error in breaker["errors"]:
        print(f"[GATE:BLOCK] invalid circuit breaker: {error}")

    verdict = "pass"
    exit_code = 0
    if report["missing"] or report["expired_stale_app_ids"]:
        if breaker_active:
            verdict = "warn_circuit_breaker"
            print(f"[GATE:WARN] circuit breaker active ({breaker_reason}); downgrading BLOCK")
        else:
            verdict = "block"
            exit_code = 1

    for item in report["missing"]:
        print(
            f"[GATE:{'WARN' if breaker_active else 'BLOCK'}] "
            f"{item['app_id']} {item['name']}: {'; '.join(item['problems'])}"
        )
    for app_id in report["stale_landing_app_ids"]:
        level = "WARN" if app_id not in report["expired_stale_app_ids"] else ("WARN" if breaker_active else "BLOCK")
        print(f"[GATE:{level}] landing shows released app no longer public: {app_id}")
    if report["enrichment_backlog"]:
        print(
            "[GATE:INFO] auto-onboarded apps awaiting human enrichment: "
            + ", ".join(report["enrichment_backlog"])
        )

    metrics: dict[str, Any] | None = None
    if args.record_ci_observation:
        run_identity, identity_errors = production_run_identity()
        if identity_errors:
            print("[GATE:ERROR] production metric identity invalid: " + ", ".join(identity_errors))
            return 2
        finished_at = now_utc()
        metrics = append_metrics(
            args.metrics_ledger,
            run_identity=run_identity,
            started_at=started_at,
            finished_at=finished_at,
            verdict=verdict,
            report=report,
        )
    if not args.no_record:
        write_report(
            args.report,
            report,
            verdict,
            breaker_reason if breaker_active else "",
            list(breaker["errors"]),
            metrics,
        )
    print(
        f"[GATE:{verdict.upper()}] public={report['public_apps']} "
        f"landing_released={report['landing_released']} "
        f"missing={len(report['missing'])} excluded={len(report['excluded_app_ids'])}"
    )
    return exit_code


if __name__ == "__main__":
    sys.exit(main())

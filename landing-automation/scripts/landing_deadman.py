#!/usr/bin/env python3
"""Fail closed when the landing reconciliation loop has no recent success."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import update_landing_data as uld

MAX_SILENCE = timedelta(hours=12)


def latest_success(payload: dict[str, Any]) -> datetime | None:
    completed: list[datetime] = []
    for run in payload.get("workflow_runs", []):
        if not isinstance(run, dict) or run.get("conclusion") != "success":
            continue
        observed = uld.parse_iso_datetime(run.get("updated_at") or run.get("run_started_at"))
        if observed is not None:
            completed.append(observed)
    return max(completed) if completed else None


def deadman_verdict(
    payload: dict[str, Any], *, at: datetime | None = None
) -> tuple[bool, str]:
    current = at or datetime.now(timezone.utc)
    last_success = latest_success(payload)
    if last_success is None:
        return False, "no successful landing reconciliation run found"
    age = current - last_success
    if age > MAX_SILENCE:
        return False, f"last successful landing reconciliation is {int(age.total_seconds())} seconds old"
    return True, f"last successful landing reconciliation is {int(age.total_seconds())} seconds old"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs-json", type=Path, required=True)
    args = parser.parse_args()
    payload = json.loads(args.runs_json.read_text(encoding="utf-8"))
    ok, detail = deadman_verdict(payload)
    print(json.dumps({"ok": ok, "detail": detail}, sort_keys=True))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

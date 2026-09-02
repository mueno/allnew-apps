from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import landing_governance_gate as gate


def _runs(count: int = 10, *, first_conclusion: str = "success") -> dict:
    rows = []
    newest = datetime(2026, 9, 2, 12, tzinfo=timezone.utc)
    for index in range(count):
        run_id = 33_000_000_000 + index
        rows.append(
            {
                "id": run_id,
                "status": "completed",
                "conclusion": first_conclusion if index == 0 else "success",
                "created_at": (newest - timedelta(hours=index * 12)).isoformat(),
                "head_branch": "main",
                "event": "schedule",
                "html_url": f"https://github.com/mueno/allnew-apps/actions/runs/{run_id}",
            }
        )
    return {"workflow_runs": rows}


def test_ten_current_successes_reach_l3_with_bound_evidence(monkeypatch) -> None:
    monkeypatch.setattr(gate, "catalog_lineage", lambda: {"pass": True, "entries": [1, 2, 3]})
    monkeypatch.setattr(
        gate,
        "precision_window",
        lambda *_args: {"pass": True, "run_count": 12, "false_positive_count": 0},
    )
    monkeypatch.setattr(gate, "production_route", lambda: {"pass": True, "failures": []})

    passed, evidence = gate.autonomy_verdict(_runs())

    assert passed is True
    assert evidence["consecutive_successful_runs"] == 10


def test_one_byte_semantic_tamper_returns_to_hold(monkeypatch) -> None:
    monkeypatch.setattr(gate, "catalog_lineage", lambda: {"pass": True, "entries": [1, 2, 3]})
    monkeypatch.setattr(gate, "precision_window", lambda *_args: {"pass": True, "run_count": 1})
    monkeypatch.setattr(gate, "production_route", lambda: {"pass": True, "failures": []})

    passed, evidence = gate.autonomy_verdict(_runs(first_conclusion="failure"))

    assert passed is False
    assert evidence["consecutive_successful_runs"] == 0


def test_precision_window_uses_verified_production_runs_when_ledger_is_absent(
    monkeypatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(gate, "METRICS", tmp_path / "missing.jsonl")

    result = gate.precision_window(_runs(), datetime(2026, 9, 2, 13, tzinfo=timezone.utc))

    assert result["pass"] is True
    assert result["run_count"] == 10
    assert result["elapsed_hours"] >= 72


def test_one_production_run_cannot_satisfy_precision_window(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(gate, "METRICS", tmp_path / "missing.jsonl")

    result = gate.precision_window(_runs(1), datetime(2026, 9, 2, 13, tzinfo=timezone.utc))

    assert result["pass"] is False
    assert result["reason"] == "precision_window_not_satisfied"
    assert result["run_count"] == 1


def test_uuid_metric_row_is_rejected_as_unbound(monkeypatch, tmp_path: Path) -> None:
    ledger = tmp_path / "metrics.jsonl"
    ledger.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "run_id": "3c60aeda-9e3b-4d54-9acd-73ac5bb897df",
                "finished_at": "2026-09-02T00:00:00Z",
                "false_positive_count": 0,
            }
        )
        + "\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(gate, "METRICS", ledger)

    result = gate.precision_window(_runs(), datetime(2026, 9, 2, 13, tzinfo=timezone.utc))

    assert result["pass"] is False
    assert result["reason"] == "precision_ledger_unbound_row"
    assert "run_id_not_bound_to_production" in result["row_errors"]


def test_first_declared_block_requires_human_escalation() -> None:
    result = gate.block_report("parity_gate")

    assert result["verdict"] == "block"
    assert result["consecutive_blocks"] == 1
    assert result["max_consecutive_blocks"] == 1
    assert result["escalation_required"] is True
    assert result["forward_ops_allowed"] is False


def test_current_catalog_has_three_preserved_auto_onboarded_lineages() -> None:
    result = gate.catalog_lineage()

    assert result["pass"] is True
    assert len(result["entries"]) >= 3


def test_precision_window_rejects_invalid_json(monkeypatch, tmp_path: Path) -> None:
    ledger = tmp_path / "metrics.jsonl"
    ledger.write_text("{", encoding="utf-8")
    monkeypatch.setattr(gate, "METRICS", ledger)

    result = gate.precision_window(_runs(), datetime(2026, 9, 2, 13, tzinfo=timezone.utc))

    assert result["pass"] is False
    assert result["reason"] == "precision_ledger_invalid_json"

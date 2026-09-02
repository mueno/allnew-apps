"""Tests for the fail-closed landing parity gate."""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

import landing_parity_gate as gate

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"


def lookup_with(*app_ids):
    return {
        "jp": {
            str(app_id): {"trackId": int(app_id), "trackName": f"App {app_id}"}
            for app_id in app_ids
        },
        "us": {},
    }


def generated_with(*entries):
    return {"schema_version": 1, "apps": list(entries)}


def released(app_id, slug=None):
    return {
        "slug": slug or f"app-{app_id}",
        "asc_app_id": str(app_id),
        "status": "released",
        "app_store_url": f"https://apps.apple.com/jp/app/x/id{app_id}",
    }


def catalog_with(*app_ids):
    return {
        "artist_id": "999",
        "apps": [{"slug": f"app-{app_id}", "asc_app_id": str(app_id)} for app_id in app_ids],
    }


def valid_breaker(*, opened_at=None, expires_at=None, entry_id="breaker-1"):
    opened = opened_at or (datetime.now(timezone.utc) - timedelta(minutes=5))
    expires = expires_at or (opened + timedelta(hours=1))
    return {
        "entry_id": entry_id,
        "opened_at": opened.isoformat(),
        "expires_at": expires.isoformat(),
        "opened_by": "release-manager@example.invalid",
        "andon_issue": "https://github.com/mueno/allnew-apps/issues/123",
        "reason": "confirmed false positive under repair",
    }


class TestEvaluateParity:
    def test_pass_when_all_public_apps_released(self):
        report = gate.evaluate_parity(
            lookup_with("1", "2"),
            generated_with(released("1"), released("2")),
            catalog_with("1", "2"),
            {},
        )
        assert report["missing"] == []

    def test_missing_app_is_reported(self):
        report = gate.evaluate_parity(
            lookup_with("1", "2"),
            generated_with(released("1")),
            catalog_with("1"),
            {},
        )
        assert len(report["missing"]) == 1
        assert report["missing"][0]["app_id"] == "2"
        assert "not in landing-apps.generated.json" in report["missing"][0]["problems"]
        assert "not in app_catalog.json" in report["missing"][0]["problems"]

    def test_wrong_status_is_reported(self):
        entry = released("2")
        entry["status"] = "draft"
        report = gate.evaluate_parity(
            lookup_with("1", "2"),
            generated_with(released("1"), entry),
            catalog_with("1", "2"),
            {},
        )
        assert len(report["missing"]) == 1
        assert "status=draft (expected released)" in report["missing"][0]["problems"]

    def test_missing_store_url_is_reported(self):
        entry = released("1")
        entry["app_store_url"] = ""
        report = gate.evaluate_parity(
            lookup_with("1"), generated_with(entry), catalog_with("1"), {}
        )
        assert report["missing"][0]["problems"] == ["app_store_url missing"]

    def test_exclusion_is_honored(self):
        report = gate.evaluate_parity(
            lookup_with("1", "2"),
            generated_with(released("1")),
            catalog_with("1"),
            {"2": {"app_id": "2", "reason": "B2B only"}},
        )
        assert report["missing"] == []
        assert report["excluded_app_ids"] == ["2"]

    def test_stale_landing_entry_enters_grace_period(self):
        report = gate.evaluate_parity(
            lookup_with("1"),
            generated_with(released("1"), released("9")),
            catalog_with("1", "9"),
            {},
        )
        assert report["missing"] == []
        assert report["stale_landing_app_ids"] == ["9"]

    def test_stale_landing_entry_blocks_after_seven_days(self):
        now = datetime(2026, 9, 2, tzinfo=timezone.utc)
        first_seen, expired = gate.classify_stale_apps(
            ["9"],
            {"stale_first_seen": {"9": (now - timedelta(days=8)).isoformat()}},
            at=now,
        )
        assert "9" in first_seen
        assert expired == ["9"]

    def test_new_stale_landing_entry_does_not_block_immediately(self):
        now = datetime(2026, 9, 2, tzinfo=timezone.utc)
        _first_seen, expired = gate.classify_stale_apps(["9"], {}, at=now)
        assert expired == []


def test_metrics_ledger_is_append_only_and_reports_denominator(tmp_path):
    ledger = tmp_path / "metrics.jsonl"
    started = datetime(2026, 9, 2, 0, 0, tzinfo=timezone.utc)
    summary = gate.append_metrics(
        ledger,
        run_id="run-1",
        started_at=started,
        finished_at=started + timedelta(seconds=2),
        verdict="block",
        report={"missing": [{"app_id": "1"}], "expired_stale_app_ids": [], "false_positive_exclusion_ids": []},
    )
    gate.append_metrics(
        ledger,
        run_id="run-2",
        started_at=started + timedelta(minutes=1),
        finished_at=started + timedelta(minutes=1, seconds=2),
        verdict="pass",
        report={"missing": [], "expired_stale_app_ids": [], "false_positive_exclusion_ids": ["2"]},
    )

    assert len(ledger.read_text().splitlines()) == 2
    assert summary["true_positive_count"] == 1
    assert summary["false_positive_count"] == 0
    assert summary["precision"] == 1.0


class TestExclusionsAndBreaker:
    def test_exclusion_requires_reason(self, tmp_path):
        path = tmp_path / "exclusions.json"
        path.write_text(json.dumps({"exclusions": [{"app_id": "1", "reason": ""}]}))
        with pytest.raises(ValueError):
            gate.load_exclusions(path)

    def test_exclusion_requires_owner_expiry_and_review(self, tmp_path):
        path = tmp_path / "exclusions.json"
        path.write_text(json.dumps({"exclusions": [{"app_id": "1", "reason": "temporary"}]}))

        with pytest.raises(ValueError, match="owner"):
            gate.load_exclusions(path)

    def test_expired_exclusion_fails_closed(self, tmp_path):
        path = tmp_path / "exclusions.json"
        path.write_text(
            json.dumps(
                {
                    "exclusions": [
                        {
                            "app_id": "1",
                            "reason": "temporary",
                            "owner": "release-manager@example.invalid",
                            "review_by": "2026-01-01T00:00:00Z",
                            "expires_at": "2026-01-02T00:00:00Z",
                        }
                    ]
                }
            )
        )

        with pytest.raises(ValueError, match="expired"):
            gate.load_exclusions(path)

    def test_breaker_active_until_expiry(self, tmp_path):
        path = tmp_path / "breaker.json"
        ledger = tmp_path / "parity_circuit_breaker_ledger.json"
        breaker = valid_breaker()
        path.write_text(json.dumps(breaker))
        ledger.write_text(json.dumps({"entries": [breaker]}))
        active, reason = gate.circuit_breaker_active(path, ledger)
        assert active is True
        assert reason == "confirmed false positive under repair"

    def test_breaker_expired(self, tmp_path):
        path = tmp_path / "breaker.json"
        ledger = tmp_path / "parity_circuit_breaker_ledger.json"
        opened = datetime.now(timezone.utc) - timedelta(hours=2)
        breaker = valid_breaker(opened_at=opened, expires_at=opened + timedelta(hours=1))
        path.write_text(json.dumps(breaker))
        ledger.write_text(json.dumps({"entries": [breaker]}))
        assert gate.circuit_breaker_active(path, ledger) == (False, "confirmed false positive under repair")

    def test_breaker_absent(self, tmp_path):
        assert gate.circuit_breaker_active(tmp_path / "none.json") == (False, "")

    def test_breaker_over_72_hours_is_rejected(self, tmp_path):
        path = tmp_path / "breaker.json"
        ledger = tmp_path / "parity_circuit_breaker_ledger.json"
        opened = datetime.now(timezone.utc) - timedelta(minutes=1)
        breaker = valid_breaker(opened_at=opened, expires_at=opened + timedelta(hours=73))
        path.write_text(json.dumps(breaker))
        ledger.write_text(json.dumps({"entries": [breaker]}))

        decision = gate._breaker_decision(path, ledger)

        assert decision["active"] is False
        assert "circuit_breaker_duration_exceeds_72_hours" in decision["errors"]

    def test_breaker_requires_owner_andon_and_ledger_binding(self, tmp_path):
        path = tmp_path / "breaker.json"
        breaker = valid_breaker()
        breaker.pop("opened_by")
        path.write_text(json.dumps(breaker))

        decision = gate._breaker_decision(path, tmp_path / "missing-ledger.json")

        assert decision["active"] is False
        assert "circuit_breaker_opened_by_missing" in decision["errors"]
        assert "circuit_breaker_ledger_missing_or_invalid" in decision["errors"]

    def test_breaker_30_day_cumulative_limit_is_rejected(self, tmp_path):
        path = tmp_path / "breaker.json"
        ledger = tmp_path / "parity_circuit_breaker_ledger.json"
        now = datetime.now(timezone.utc)
        current = valid_breaker(opened_at=now - timedelta(hours=1), expires_at=now + timedelta(hours=1))
        history = []
        for index in range(3):
            opened = now - timedelta(days=3 + index * 4)
            history.append(valid_breaker(opened_at=opened, expires_at=opened + timedelta(hours=72), entry_id=f"old-{index}"))
        path.write_text(json.dumps(current))
        ledger.write_text(json.dumps({"entries": [*history, current]}))

        decision = gate._breaker_decision(path, ledger, at=now)

        assert decision["active"] is False
        assert "circuit_breaker_30_day_cumulative_limit_exceeded" in decision["errors"]


class TestGateProcess:
    """End-to-end exit-code behavior via subprocess (the CI contract)."""

    def run_gate(self, tmp_path, lookup, generated, catalog, breaker=None):
        paths = {}
        for name, payload in (
            ("lookup", lookup),
            ("generated", generated),
            ("catalog", catalog),
        ):
            paths[name] = tmp_path / f"{name}.json"
            paths[name].write_text(json.dumps(payload), encoding="utf-8")
        exclusions = tmp_path / "exclusions.json"
        exclusions.write_text(json.dumps({"exclusions": []}), encoding="utf-8")
        breaker_path = tmp_path / "breaker.json"
        breaker_ledger_path = tmp_path / "breaker-ledger.json"
        if breaker:
            breaker_path.write_text(json.dumps(breaker), encoding="utf-8")
            breaker_ledger_path.write_text(
                json.dumps({"entries": [breaker]}), encoding="utf-8"
            )
        report = tmp_path / "report.json"
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPTS_DIR / "landing_parity_gate.py"),
                "--catalog", str(paths["catalog"]),
                "--output", str(paths["generated"]),
                "--exclusions", str(exclusions),
                "--circuit-breaker", str(breaker_path),
                "--circuit-breaker-ledger", str(breaker_ledger_path),
                "--report", str(report),
                "--lookup-file", str(paths["lookup"]),
                "--allow-unsealed-lookup-fixture",
                "--metrics-ledger", str(tmp_path / "metrics.jsonl"),
            ],
            capture_output=True,
            text=True,
        )
        return result, report

    def test_exit_zero_on_parity(self, tmp_path):
        result, report = self.run_gate(
            tmp_path, lookup_with("1"), generated_with(released("1")), catalog_with("1")
        )
        assert result.returncode == 0, result.stdout + result.stderr
        assert json.loads(report.read_text())["verdict"] == "pass"

    def test_exit_one_on_missing_app(self, tmp_path):
        result, report = self.run_gate(
            tmp_path, lookup_with("1", "2"), generated_with(released("1")), catalog_with("1")
        )
        assert result.returncode == 1
        assert json.loads(report.read_text())["verdict"] == "block"

    def test_circuit_breaker_downgrades_to_warn(self, tmp_path):
        result, report = self.run_gate(
            tmp_path,
            lookup_with("1", "2"),
            generated_with(released("1")),
            catalog_with("1"),
            breaker=valid_breaker(),
        )
        assert result.returncode == 0
        assert json.loads(report.read_text())["verdict"] == "warn_circuit_breaker"

    def test_unbounded_breaker_does_not_downgrade(self, tmp_path):
        result, report = self.run_gate(
            tmp_path,
            lookup_with("1", "2"),
            generated_with(released("1")),
            catalog_with("1"),
            breaker={"expires_at": "2099-12-31T23:59:59+00:00", "reason": "temporary"},
        )
        assert result.returncode == 1
        payload = json.loads(report.read_text())
        assert payload["verdict"] == "block"
        assert "circuit_breaker_duration_exceeds_72_hours" in payload["circuit_breaker_errors"] or "circuit_breaker_opened_at_missing" in payload["circuit_breaker_errors"]

    def test_empty_ground_truth_fails_closed(self, tmp_path):
        result, _report = self.run_gate(
            tmp_path, {"jp": {}, "us": {}}, generated_with(released("1")), catalog_with("1")
        )
        assert result.returncode == 1

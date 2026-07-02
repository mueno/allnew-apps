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

    def test_stale_landing_entry_is_warned_not_blocked(self):
        report = gate.evaluate_parity(
            lookup_with("1"),
            generated_with(released("1"), released("9")),
            catalog_with("1", "9"),
            {},
        )
        assert report["missing"] == []
        assert report["stale_landing_app_ids"] == ["9"]


class TestExclusionsAndBreaker:
    def test_exclusion_requires_reason(self, tmp_path):
        path = tmp_path / "exclusions.json"
        path.write_text(json.dumps({"exclusions": [{"app_id": "1", "reason": ""}]}))
        with pytest.raises(ValueError):
            gate.load_exclusions(path)

    def test_breaker_active_until_expiry(self, tmp_path):
        path = tmp_path / "breaker.json"
        future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        path.write_text(json.dumps({"expires_at": future, "reason": "repairing FP"}))
        active, reason = gate.circuit_breaker_active(path)
        assert active is True
        assert reason == "repairing FP"

    def test_breaker_expired(self, tmp_path):
        path = tmp_path / "breaker.json"
        past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        path.write_text(json.dumps({"expires_at": past, "reason": "old"}))
        assert gate.circuit_breaker_active(path) == (False, "")

    def test_breaker_absent(self, tmp_path):
        assert gate.circuit_breaker_active(tmp_path / "none.json") == (False, "")


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
        if breaker:
            breaker_path.write_text(json.dumps(breaker), encoding="utf-8")
        report = tmp_path / "report.json"
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPTS_DIR / "landing_parity_gate.py"),
                "--catalog", str(paths["catalog"]),
                "--output", str(paths["generated"]),
                "--exclusions", str(exclusions),
                "--circuit-breaker", str(breaker_path),
                "--report", str(report),
                "--lookup-file", str(paths["lookup"]),
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
        future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        result, report = self.run_gate(
            tmp_path,
            lookup_with("1", "2"),
            generated_with(released("1")),
            catalog_with("1"),
            breaker={"expires_at": future, "reason": "known FP under repair"},
        )
        assert result.returncode == 0
        assert json.loads(report.read_text())["verdict"] == "warn_circuit_breaker"

    def test_empty_ground_truth_fails_closed(self, tmp_path):
        result, _report = self.run_gate(
            tmp_path, {"jp": {}, "us": {}}, generated_with(released("1")), catalog_with("1")
        )
        assert result.returncode == 1

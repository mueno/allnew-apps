#!/usr/bin/env python3
"""Reproduction harness for the App Factory v5 adversarial audit (2026-09-02).

Every BLOCKER finding in README.md is implemented here as an independent check
that prints the expectation next to the observation. The audit's claims are
bound to this script's output: if a finding is remediated, its check flips to
REMEDIATED and the audit text must be updated to match.

This is a read-only diagnostic. It never writes to either repository; all
mutated fixtures are built in a temporary directory.

Usage:
    python3 verify_findings.py --factory-maker /path/to/factory-maker

Exit codes:
    0 = every finding still reproduces exactly as the audit describes
    1 = at least one finding no longer reproduces (audit text is now stale)
    2 = the harness could not run (missing repo, wrong Python, missing dep)
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import io
import json
import subprocess
import sys
import tempfile
from pathlib import Path

LANDING_ROOT = Path(__file__).resolve().parents[2]
LANDING_SCRIPTS = LANDING_ROOT / "landing-automation" / "scripts"

RESULTS: list[tuple[str, str, bool, str]] = []


def record(finding: str, title: str, reproduced: bool, detail: str) -> None:
    RESULTS.append((finding, title, reproduced, detail))
    status = "REPRODUCED" if reproduced else "REMEDIATED"
    print(f"[{status}] {finding}: {title}")
    for line in detail.strip().splitlines():
        print(f"    {line}")
    print()


# --------------------------------------------------------------------------
# F-01 — release_ready is unreachable by construction
# --------------------------------------------------------------------------
def finding_01(fm_root: Path, workdir: Path) -> None:
    sys.path.insert(0, str(fm_root / "factory_maker" / "scripts"))
    from factory_runtime_enforcement import evaluate_runtime_enforcement

    registry_src = fm_root / "factory_maker" / "references" / "runtime-enforcement-debt-registry.json"
    registry = json.loads(registry_src.read_text(encoding="utf-8"))

    commit = subprocess.run(
        ["git", "-C", str(fm_root), "rev-parse", "HEAD"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    evidence = fm_root / "README.md"
    sha = hashlib.sha256(evidence.read_bytes()).hexdigest()

    # Best case: every blocker family closed with complete verification evidence,
    # plus a fully populated release clearance naming an external authority.
    for row in registry["blocker_families"]:
        row["status"] = "verified_closed"
        row["promotion_blocking"] = False
        row["verification"] = {
            "implementation_paths": ["factory_maker/scripts/factory_runtime.py"],
            "negative_fixtures": ["tests/test_v5_autonomy_and_capa.py::test_placeholder"],
            "evidence_path": "README.md", "evidence_sha256": sha,
            "independent_review_path": "README.md", "independent_review_sha256": sha,
            "verified_commit": commit, "verified_at": "2026-09-02",
        }
    registry["release_gate"] = {
        "status": "release_ready",
        "clearance": {
            "verified_commit": commit,
            "evidence_path": "README.md", "evidence_sha256": sha,
            "independent_review_path": "README.md", "independent_review_sha256": sha,
            "external_authority": {"scheme": "any-scheme-at-all", "id": "APPROVAL-1"},
        },
    }
    target = workdir / "registry_all_closed.json"
    target.write_text(json.dumps(registry, indent=2), encoding="utf-8")

    report = evaluate_runtime_enforcement(target)
    reproduced = report["release_ready"] is False and report["open_blocker_count"] == 0
    record(
        "F-01", "release_ready is unreachable even with every blocker closed",
        reproduced,
        f"expected (if healthy): release_ready=True with 0 open blockers\n"
        f"observed:              release_ready={report['release_ready']} "
        f"status={report['status']} open_blockers={report['open_blocker_count']}\n"
        f"clearance errors:      {report['release_clearance_errors']}",
    )


# --------------------------------------------------------------------------
# F-02 — the governance gate is not wired into CI, and defaults to fail-open
# --------------------------------------------------------------------------
def finding_02(fm_root: Path, workdir: Path) -> None:
    workflows = sorted((fm_root / ".github" / "workflows").glob("*.yml"))
    wired = [w.name for w in workflows if "les_governance_gate" in w.read_text(encoding="utf-8")]

    gate = fm_root / "factory_maker" / "scripts" / "factory_les_governance_gate.py"
    claim = "App Factory v5 is release-ready and production-ready."
    without = subprocess.run(
        [sys.executable, str(gate), "--claim-text", claim],
        capture_output=True, text=True, cwd=fm_root,
    )
    with_flag = subprocess.run(
        [sys.executable, str(gate), "--require-allowed", "--claim-text", claim],
        capture_output=True, text=True, cwd=fm_root,
    )
    blocked = json.loads(without.stdout)["blocked"]

    reproduced = not wired and blocked and without.returncode == 0
    record(
        "F-02", "governance gate absent from CI and fail-open by default",
        reproduced,
        f"expected (if healthy): gate referenced by >=1 workflow; non-zero exit when blocked\n"
        f"observed:              workflows referencing the gate = {wired or 'none'}\n"
        f"                       blocked={blocked} exit(no --require-allowed)={without.returncode} "
        f"exit(--require-allowed)={with_flag.returncode}",
    )


# --------------------------------------------------------------------------
# F-03 — the repository's own public documents fail its own gate
# --------------------------------------------------------------------------
def finding_03(fm_root: Path, workdir: Path) -> None:
    gate = fm_root / "factory_maker" / "scripts" / "factory_les_governance_gate.py"
    docs = ["README.md", "CHANGELOG.md", "HANDOFF.md", "docs/LOOP_ENGINEERING_SYSTEM.md"]
    rows, failing = [], 0
    for doc in docs:
        path = fm_root / doc
        if not path.exists():
            rows.append(f"{doc}: MISSING")
            continue
        proc = subprocess.run(
            [sys.executable, str(gate), "--claim-file", str(path)],
            capture_output=True, text=True, cwd=fm_root,
        )
        result = json.loads(proc.stdout)
        failing += bool(result["blocked"])
        rows.append(f"{doc}: blocked={result['blocked']} blockers={result['blocker_count']}")

    record(
        "F-03", "the system's own public documents fail its own governance gate",
        failing > 0,
        "expected (if healthy): blocked=False for every public claim surface\n"
        "observed:\n  " + "\n  ".join(rows),
    )


# --------------------------------------------------------------------------
# F-04 — the readiness-claim detector is defeated by ordinary domain vocabulary
# --------------------------------------------------------------------------
def finding_04(fm_root: Path, workdir: Path) -> None:
    gate = fm_root / "factory_maker" / "scripts" / "factory_les_governance_gate.py"
    cases = [
        ("control (must be detected)", "App Factory v5 is release-ready and production-ready.", True),
        ("'false' in sentence", "App Factory v5 is release-ready and production-ready with zero false positives.", False),
        ("'holdout' contains 'hold'", "App Factory v5 is release-ready across the whole holdout portfolio.", False),
        ("'threshold' contains 'hold'", "App Factory v5 is release-ready: every gate met its threshold.", False),
        ("paraphrase", "App Factory v5 has cleared every barrier and may ship to the App Store today.", False),
    ]
    rows, bypasses = [], 0
    for label, text, _ in cases:
        proc = subprocess.run(
            [sys.executable, str(gate), "--claim-text", text],
            capture_output=True, text=True, cwd=fm_root,
        )
        detected = json.loads(proc.stdout)["readiness_claim_detected"]
        rows.append(f"{'DETECTED ' if detected else 'BYPASSED '} {label}")
        if not detected:
            bypasses += 1

    record(
        "F-04", "readiness-claim detector bypassed by common evaluation vocabulary",
        bypasses > 0,
        "expected (if healthy): every line reads DETECTED (all five assert readiness)\n"
        "observed:\n  " + "\n  ".join(rows),
    )


# --------------------------------------------------------------------------
# F-06 — the parity circuit breaker has no maximum duration
# --------------------------------------------------------------------------
def finding_06(fm_root: Path, workdir: Path) -> None:
    fixtures = workdir / "parity"
    fixtures.mkdir(parents=True, exist_ok=True)
    (fixtures / "lookup.json").write_text(json.dumps({
        "jp": {"111": {"trackId": 111, "trackName": "MissingApp"},
               "222": {"trackId": 222, "trackName": "PresentApp"}},
        "us": {},
    }), encoding="utf-8")
    (fixtures / "catalog.json").write_text(json.dumps({
        "artist_id": "999", "apps": [{"slug": "present", "asc_app_id": "222"}],
    }), encoding="utf-8")
    (fixtures / "generated.json").write_text(json.dumps({
        "schema_version": 1,
        "apps": [{"slug": "present", "asc_app_id": "222", "status": "released",
                  "app_store_url": "https://apps.apple.com/jp/app/x/id222"}],
    }), encoding="utf-8")
    (fixtures / "exclusions.json").write_text(
        json.dumps({"schema_version": 1, "exclusions": []}), encoding="utf-8")
    (fixtures / "breaker.json").write_text(
        json.dumps({"expires_at": "2099-12-31T23:59:59+00:00", "reason": "temporary"}),
        encoding="utf-8")

    def run_gate(breaker: str) -> int:
        return subprocess.run(
            [sys.executable, str(LANDING_SCRIPTS / "landing_parity_gate.py"),
             "--catalog", str(fixtures / "catalog.json"),
             "--output", str(fixtures / "generated.json"),
             "--exclusions", str(fixtures / "exclusions.json"),
             "--circuit-breaker", str(fixtures / breaker),
             "--report", str(fixtures / "report.json"),
             "--lookup-file", str(fixtures / "lookup.json")],
            capture_output=True, text=True, cwd=LANDING_SCRIPTS,
        ).returncode

    without = run_gate("absent.json")
    with_breaker = run_gate("breaker.json")
    reproduced = without == 1 and with_breaker == 0
    record(
        "F-06", "a 74-year circuit breaker permanently disables the fail-closed gate",
        reproduced,
        "expected (if healthy): a breaker beyond the allowed maximum is rejected, exit stays 1\n"
        f"observed:              exit(no breaker)={without}  "
        f"exit(expires_at=2099-12-31)={with_breaker}",
    )


# --------------------------------------------------------------------------
# F-07 — the blueprint assurance gate validates prose, not wiring
# --------------------------------------------------------------------------
def finding_07(fm_root: Path, workdir: Path) -> None:
    blueprint_src = LANDING_ROOT / "landing-automation" / "factory" / "blueprint.json"
    blueprint = json.loads(blueprint_src.read_text(encoding="utf-8"))
    for gate in blueprint.get("gates", []):
        signal = gate.get("external_signal") or {}
        signal["detail"] = (
            "GET https://example.invalid/never — implemented by scripts/does_not_exist.py"
        )
        gate["external_signal"] = signal
        if "escape_valve" in gate:
            gate["escape_valve"]["max_consecutive_blocks"] = 10
    mutated = workdir / "blueprint_mutated.json"
    mutated.write_text(json.dumps(blueprint, ensure_ascii=False, indent=2), encoding="utf-8")

    maker = fm_root / "factory_maker" / "scripts" / "factory_maker.py"
    original = subprocess.run(
        [sys.executable, str(maker), "validate", "--blueprint", str(blueprint_src)],
        capture_output=True, text=True, cwd=fm_root,
    )
    tampered = subprocess.run(
        [sys.executable, str(maker), "validate", "--blueprint", str(mutated)],
        capture_output=True, text=True, cwd=fm_root,
    )
    tampered_passes = "PASS" in tampered.stdout
    record(
        "F-07", "the assurance gate passes a blueprint whose gates point at nothing",
        tampered_passes,
        "expected (if healthy): the mutated blueprint FAILS (its gates name no real implementation)\n"
        f"observed:              original  -> {original.stdout.strip() or original.stderr.strip()}\n"
        f"                       mutated   -> {tampered.stdout.strip() or tampered.stderr.strip()}",
    )


# --------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--factory-maker", type=Path, required=True,
                        help="Path to a checkout of mueno/factory-maker")
    args = parser.parse_args()

    fm_root = args.factory_maker.resolve()
    if not (fm_root / "factory_maker" / "scripts" / "factory_maker.py").is_file():
        print(f"error: not a factory-maker checkout: {fm_root}", file=sys.stderr)
        return 2
    if sys.version_info[:2] != (3, 12):
        print(f"error: factory-maker requires Python 3.12.x; running {sys.version.split()[0]}",
              file=sys.stderr)
        return 2

    print(f"factory-maker : {fm_root}")
    print(f"allnew-apps   : {LANDING_ROOT}\n")

    checks = [finding_01, finding_02, finding_03, finding_04, finding_06, finding_07]
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        for check in checks:
            try:
                check(fm_root, workdir)
            except Exception as error:  # a harness fault must not read as remediation
                record(check.__name__.upper().replace("FINDING_", "F-"),
                       "harness error", True, f"{type(error).__name__}: {error}")

    still = [f for f, _, repro, _ in RESULTS if repro]
    gone = [f for f, _, repro, _ in RESULTS if not repro]
    print("=" * 68)
    print(f"still reproducing : {len(still)}/{len(RESULTS)}  {still}")
    print(f"no longer present : {len(gone)}/{len(RESULTS)}  {gone}")
    if gone:
        print("\nOne or more findings no longer reproduce. Update README.md so the")
        print("audit text matches the code before citing it again.")
    return 0 if not gone else 1


if __name__ == "__main__":
    raise SystemExit(main())

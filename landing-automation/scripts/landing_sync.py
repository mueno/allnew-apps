#!/usr/bin/env python3
"""Single choke point for landing-page synchronisation.

Every automated path (scheduled reconcile, webhook event follow-up, manual run)
goes through this orchestrator, so no path can skip governance, discovery, or the parity
gate. Steps, each fail-closed:

  1. governance         — live history, catalog lineage, precision, and route wiring
  2. store_discovery    — ground truth from the App Store artist listing;
                          auto-onboards unknown released apps into the catalog
  3. store_content_sync — converges machine-owned entries with published
                          store content; surfaces drift on curated entries
  4. update_landing_data --reconcile-app-store
                         — refreshes landing data for every catalog app
  5. render_landing_page — bakes cards/JSON-LD into index.html (validates)
  6. landing_parity_gate — asserts public apps ⊆ landing page (exit 1 on gap)

A non-zero exit from any step aborts the run with that step's exit code.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent


GATE_BY_STEP = {
    "discovery": "ground_truth_lookup",
    "content-sync": "ground_truth_lookup",
    "reconcile": "reconcile_nonempty",
    "render": "render_validation",
    "parity-gate": "parity_gate",
}


def run_step(name: str, command: list[str], *, no_record: bool = False) -> None:
    print(f"::group::landing-sync {name}")
    result = subprocess.run(command, check=False)
    print("::endgroup::")
    if result.returncode != 0:
        print(f"[landing-sync] step failed: {name} (exit {result.returncode})")
        if name in GATE_BY_STEP:
            governance = [
                sys.executable,
                str(SCRIPTS_DIR / "landing_governance_gate.py"),
                "--stage",
                "block",
                "--failed-gate",
                GATE_BY_STEP[name],
            ]
            if no_record:
                governance.extend(["--report", str(Path(tempfile.gettempdir()) / "landing-governance-report.json")])
            subprocess.run(governance, check=False)
        raise SystemExit(result.returncode)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--no-record",
        action="store_true",
        help="Run the full gate without writing report/metrics state",
    )
    args = parser.parse_args()
    lookup_cache = Path(tempfile.gettempdir()) / "allnew-artist-lookup.json"
    python = sys.executable

    governance = [
        python,
        str(SCRIPTS_DIR / "landing_governance_gate.py"),
        "--stage",
        "pre-publish",
    ]
    if args.no_record:
        governance.extend(["--report", str(Path(tempfile.gettempdir()) / "landing-governance-report.json")])
    run_step("governance", governance, no_record=args.no_record)

    run_step(
        "discovery",
        [python, str(SCRIPTS_DIR / "store_discovery.py"), "--lookup-cache", str(lookup_cache)],
        no_record=args.no_record,
    )
    run_step(
        "content-sync",
        [python, str(SCRIPTS_DIR / "store_content_sync.py"), "--lookup-file", str(lookup_cache)],
        no_record=args.no_record,
    )
    run_step(
        "reconcile",
        [python, str(SCRIPTS_DIR / "update_landing_data.py"), "--reconcile-app-store"],
        no_record=args.no_record,
    )
    run_step("render", [python, str(SCRIPTS_DIR / "render_landing_page.py")], no_record=args.no_record)
    parity_command = [
        python,
        str(SCRIPTS_DIR / "landing_parity_gate.py"),
        "--lookup-file",
        str(lookup_cache),
    ]
    if args.no_record:
        parity_command.append("--no-record")
    run_step("parity-gate", parity_command, no_record=args.no_record)
    print("[landing-sync] all steps passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

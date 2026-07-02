#!/usr/bin/env python3
"""Single choke point for landing-page synchronisation.

Every automated path (scheduled reconcile, webhook event follow-up, manual run)
goes through this orchestrator, so no path can skip discovery or the parity
gate. Steps, each fail-closed:

  1. store_discovery   — ground truth from the App Store artist listing;
                         auto-onboards unknown released apps into the catalog
  2. update_landing_data --reconcile-app-store
                        — refreshes landing data for every catalog app
  3. render_landing_page — bakes cards/JSON-LD into index.html (validates)
  4. landing_parity_gate — asserts public apps ⊆ landing page (exit 1 on gap)

A non-zero exit from any step aborts the run with that step's exit code.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent


def run_step(name: str, command: list[str]) -> None:
    print(f"::group::landing-sync {name}")
    result = subprocess.run(command, check=False)
    print("::endgroup::")
    if result.returncode != 0:
        print(f"[landing-sync] step failed: {name} (exit {result.returncode})")
        raise SystemExit(result.returncode)


def main() -> int:
    lookup_cache = Path(tempfile.gettempdir()) / "allnew-artist-lookup.json"
    python = sys.executable

    run_step(
        "discovery",
        [python, str(SCRIPTS_DIR / "store_discovery.py"), "--lookup-cache", str(lookup_cache)],
    )
    run_step(
        "reconcile",
        [python, str(SCRIPTS_DIR / "update_landing_data.py"), "--reconcile-app-store"],
    )
    run_step("render", [python, str(SCRIPTS_DIR / "render_landing_page.py")])
    run_step(
        "parity-gate",
        [python, str(SCRIPTS_DIR / "landing_parity_gate.py"), "--lookup-file", str(lookup_cache)],
    )
    print("[landing-sync] all steps passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

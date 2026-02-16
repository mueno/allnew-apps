#!/usr/bin/env python3
"""Generate landing-sync caller workflows for each app from the catalog.

Reads app_catalog.json and produces per-app workflow YAML files that call
the reusable-landing-sync workflow in mueno/allnew-apps.

Usage:
  # Preview what would be generated (dry-run)
  python3 generate_caller_workflows.py

  # Write files to each app's .github/workflows/
  python3 generate_caller_workflows.py --write

  # Generate for a single app
  python3 generate_caller_workflows.py --slug weightsnap --write
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "landing-automation" / "config" / "app_catalog.json"
TEMPLATE_PATH = ROOT / "landing-automation" / "templates" / "landing-sync-caller.yml"
PROJECTS_DIR = Path.home() / "Development" / "projects"

# Map slug → project directory name (only for cases where they differ)
SLUG_TO_PROJECT = {
    "bloodpressuresnap": "BloodPressureSnap",
    "weightsnap": "WeightSnap",
    "thermosnap": "ThermoSnap",
    "glucosnap": "GlucoSnap",
    "oxisnap": "OxiSnap",
    "pupweight": "PupWeight",
    "babyvox": "BabyVox",
    "waistvox": "WaistVox",
    "coughwav": "CoughWav",
    "botto": "ZenFlip",
    "mofulens": "MofuLens",
    "timelens": "TimeLens",
}

ASC_APP_IDS = {
    "weightsnap": "6758825019",
    "bloodpressuresnap": "6759076255",
    "glucosnap": "6759076419",
    "oxisnap": "6759076145",
    "thermosnap": "6759076372",
    "waistvox": "6759076494",
    "babyvox": "6759076543",
    "coughwav": "6759076606",
    "pupweight": "6759076505",
    "botto": "6759169189",
    "timelens": "6759194873",
}


def load_catalog() -> list[dict]:
    with CATALOG_PATH.open("r", encoding="utf-8") as f:
        return json.load(f).get("apps", [])


def load_template() -> str:
    return TEMPLATE_PATH.read_text(encoding="utf-8")


def generate_workflow(template: str, app: dict) -> str:
    slug = app["slug"]
    bundle_id = app.get("bundle_id", f"jp.allnew.{slug}")
    asc_app_id = ASC_APP_IDS.get(slug, app.get("asc_app_id", ""))
    input_methods = json.dumps(app.get("input_methods", []))

    result = template
    result = result.replace("__APP_BUNDLE_ID__", bundle_id)
    result = result.replace("__APP_SLUG__", slug)
    result = result.replace("__APP_ASC_ID__", asc_app_id)
    result = result.replace("__APP_INPUT_METHODS__", input_methods)

    return result


def project_dir_for_slug(slug: str) -> Path:
    name = SLUG_TO_PROJECT.get(slug)
    if name:
        candidate = PROJECTS_DIR / name
        if candidate.exists():
            return candidate

    # Try case-insensitive match
    for p in PROJECTS_DIR.iterdir():
        if p.is_dir() and p.name.lower() == slug.lower():
            return p

    # Fallback to PascalCase guess
    return PROJECTS_DIR / slug.title().replace(" ", "")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate landing-sync caller workflows")
    parser.add_argument("--write", action="store_true", help="Write files (default: dry-run)")
    parser.add_argument("--slug", help="Generate for a single app slug only")
    parser.add_argument("--output-dir", type=Path, help="Override output directory (for testing)")
    args = parser.parse_args()

    apps = load_catalog()
    template = load_template()

    if args.slug:
        apps = [a for a in apps if a["slug"] == args.slug]
        if not apps:
            print(f"ERROR: slug '{args.slug}' not found in catalog")
            return 1

    generated = 0
    for app in apps:
        slug = app["slug"]
        workflow_content = generate_workflow(template, app)

        if args.output_dir:
            target_dir = args.output_dir / slug
        else:
            project = project_dir_for_slug(slug)
            target_dir = project / ".github" / "workflows"

        target_file = target_dir / "landing-sync.yml"

        if args.write:
            if not target_dir.parent.parent.exists():
                print(f"  SKIP {slug}: project dir not found at {target_dir.parent.parent}")
                continue
            target_dir.mkdir(parents=True, exist_ok=True)
            target_file.write_text(workflow_content, encoding="utf-8")
            print(f"  ✅ {slug}: {target_file}")
        else:
            print(f"  [dry-run] {slug} → {target_file}")

        generated += 1

    print(f"\n{'Generated' if args.write else 'Would generate'}: {generated} workflow(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

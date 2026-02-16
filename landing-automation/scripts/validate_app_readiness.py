#!/usr/bin/env python3
"""Validate that a new app is properly registered in allnew-apps before ASC submission.

Checks:
  1. app_catalog.json has an entry with matching bundle_id or slug
  2. app_slug_map.json has matching bundle_id (and optionally app_id)
  3. Onboarding image exists at assets/onboarding/<slug>-onboarding1.jpeg
  4. Per-app landing page exists at <slug>/index.html

Exit codes:
  0 = all checks pass
  1 = one or more checks failed
  2 = invalid arguments or missing config files

Usage:
  python3 validate_app_readiness.py --bundle-id jp.allnew.weightsnap
  python3 validate_app_readiness.py --slug weightsnap
  python3 validate_app_readiness.py --bundle-id jp.allnew.newapp --slug newapp
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "landing-automation" / "config" / "app_catalog.json"
SLUG_MAP_PATH = ROOT / "landing-automation" / "cloudflare-worker" / "config" / "app_slug_map.json"
ONBOARDING_DIR = ROOT / "assets" / "onboarding"


def load_json(path: Path) -> dict:
    if not path.exists():
        print(f"ERROR: config file not found: {path}")
        sys.exit(2)
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def find_catalog_entry(catalog: dict, bundle_id: str | None, slug: str | None) -> dict | None:
    for app in catalog.get("apps", []):
        if slug and app.get("slug") == slug:
            return app
        if bundle_id and app.get("bundle_id") == bundle_id:
            return app
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate app readiness for ASC submission")
    parser.add_argument("--bundle-id", help="App bundle ID (e.g. jp.allnew.weightsnap)")
    parser.add_argument("--slug", help="App slug (e.g. weightsnap)")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")
    args = parser.parse_args()

    if not args.bundle_id and not args.slug:
        parser.error("At least one of --bundle-id or --slug is required")

    catalog = load_json(CATALOG_PATH)
    slug_map = load_json(SLUG_MAP_PATH)

    results: list[dict] = []
    all_pass = True

    # --- Check 1: app_catalog.json ---
    entry = find_catalog_entry(catalog, args.bundle_id, args.slug)
    if entry:
        resolved_slug = entry["slug"]
        resolved_bundle = entry.get("bundle_id", "")
        results.append({
            "check": "app_catalog",
            "status": "PASS",
            "detail": f"Found: slug={resolved_slug}, bundle_id={resolved_bundle}",
        })
    else:
        all_pass = False
        resolved_slug = args.slug or ""
        resolved_bundle = args.bundle_id or ""
        results.append({
            "check": "app_catalog",
            "status": "FAIL",
            "detail": f"No entry for bundle_id={args.bundle_id} or slug={args.slug}",
        })

    # Use resolved slug for remaining checks
    slug = resolved_slug or args.slug or ""

    # --- Check 2: app_slug_map.json ---
    bundle_id = resolved_bundle or args.bundle_id or ""
    by_bundle = slug_map.get("by_bundle_id", {})
    if bundle_id and bundle_id in by_bundle:
        results.append({
            "check": "app_slug_map",
            "status": "PASS",
            "detail": f"by_bundle_id[{bundle_id}] = {by_bundle[bundle_id]}",
        })
    else:
        all_pass = False
        results.append({
            "check": "app_slug_map",
            "status": "FAIL",
            "detail": f"by_bundle_id missing: {bundle_id}",
        })

    # --- Check 3: Onboarding image ---
    if slug:
        # Accept .jpeg or .jpg or .png
        candidates = [
            ONBOARDING_DIR / f"{slug}-onboarding1.jpeg",
            ONBOARDING_DIR / f"{slug}-onboarding1.jpg",
            ONBOARDING_DIR / f"{slug}-onboarding1.png",
        ]
        found_image = next((p for p in candidates if p.exists()), None)
        if found_image:
            results.append({
                "check": "onboarding_image",
                "status": "PASS",
                "detail": str(found_image.relative_to(ROOT)),
            })
        else:
            all_pass = False
            results.append({
                "check": "onboarding_image",
                "status": "FAIL",
                "detail": f"Not found: assets/onboarding/{slug}-onboarding1.{{jpeg,jpg,png}}",
            })
    else:
        all_pass = False
        results.append({
            "check": "onboarding_image",
            "status": "SKIP",
            "detail": "Cannot check without resolved slug",
        })

    # --- Check 4: Per-app landing page ---
    if slug:
        landing_page = ROOT / slug / "index.html"
        if landing_page.exists():
            results.append({
                "check": "landing_page",
                "status": "PASS",
                "detail": f"{slug}/index.html exists",
            })
        else:
            all_pass = False
            results.append({
                "check": "landing_page",
                "status": "FAIL",
                "detail": f"{slug}/index.html not found",
            })
    else:
        all_pass = False
        results.append({
            "check": "landing_page",
            "status": "SKIP",
            "detail": "Cannot check without resolved slug",
        })

    # --- Output ---
    if args.json:
        output = {
            "all_pass": all_pass,
            "slug": slug,
            "bundle_id": bundle_id,
            "checks": results,
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        print(f"\n{'='*60}")
        print(f"  App Readiness Check: {slug or bundle_id}")
        print(f"{'='*60}")
        for r in results:
            icon = "✅" if r["status"] == "PASS" else "❌" if r["status"] == "FAIL" else "⏭️"
            print(f"  {icon} {r['check']}: {r['detail']}")
        print(f"{'='*60}")
        print(f"  Result: {'ALL PASS' if all_pass else 'FAILED — fix issues before ASC submission'}")
        print(f"{'='*60}\n")

    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())

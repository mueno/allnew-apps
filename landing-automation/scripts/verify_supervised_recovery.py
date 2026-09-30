#!/usr/bin/env python3
"""One-time, owner-approved L2 recovery verification; never publishes or claims L3.

Pinned to the 2026-09-30 recovery base, scope and deadline. The human operator
must bind the successful report to the same PR HEAD before merge/deployment.
The ordinary landing_sync/governance path remains unchanged.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

import local_release_publisher as local
import store_discovery as discovery
import store_content_sync as content
import update_landing_data as update
import render_landing_page as render
import landing_parity_gate as parity

ROOT = Path(__file__).resolve().parents[2]
BASE = 'f1c51996028258d9d20924bb316c2e52d9101cf5'
REPO = 'mueno/allnew-apps'
DEADLINE = datetime(2026, 10, 2, tzinfo=timezone.utc)
ALLOWED = frozenset({
    'data/landing-apps.generated.json', 'index.html',
    'landing-automation/config/app_catalog.json',
    'landing-automation/scripts/render_landing_page.py',
    'landing-automation/scripts/store_content_sync.py',
    'landing-automation/scripts/update_landing_data.py',
    'landing-automation/tests/test_published_store_reconcile.py',
    'landing-automation/docs/published-store-recovery.md',
    'landing-automation/scripts/verify_supervised_recovery.py',
    'landing-automation/tests/test_supervised_recovery.py',
})


def require(condition, message):
    if not condition:
        raise local.Rejected(message)


def policy_snapshot(root):
    permissions = local.api(root, 'actions/permissions')
    workflows = local.api(root, 'actions/workflows?per_page=100')
    require(permissions.get('enabled') is False, 'Repository Actions must be disabled')
    rows = workflows.get('workflows', [])
    require(workflows.get('total_count') == len(rows), 'Incomplete workflow inventory')
    sources = [w for w in rows if w.get('path', '').startswith('.github/workflows/')]
    require(bool(sources) and all(w.get('state') in ('disabled_manually', 'disabled_inactivity') for w in sources), 'Repository workflow enabled')
    require(local.api(root, 'pages').get('build_type') == 'workflow', 'Unexpected Pages producer')
    return {'permissions': permissions, 'workflows': workflows,
            'protection': local.api(root, 'branches/main/protection'),
            'rules': local.api(root, 'rules/branches/main'),
            'main': local.api(root, 'git/ref/heads/main')['object']['sha']}


def verify_tree(root, head, now=None):
    require((now or datetime.now(timezone.utc)) < DEADLINE, 'One-time recovery authorization expired')
    require(re.fullmatch(r'[a-f0-9]{40}', head) is not None, 'Exact reviewed HEAD required')
    require(local.git(root, 'rev-parse', 'HEAD') == head, 'Reviewed HEAD mismatch')
    local.assert_clean(root)
    require(local.git(root, 'remote', 'get-url', 'origin') in
            (f'https://github.com/{REPO}.git', f'git@github.com:{REPO}.git'), 'Unexpected origin')
    local.checked(['git', 'merge-base', '--is-ancestor', BASE, head], root)
    names = set(local.git(root, 'diff', '--name-only', BASE, head).splitlines())
    require(bool(names) and names <= ALLOWED, 'Change outside approved recovery scope')
    require(not local.git(root, 'diff', '--diff-filter=D', '--name-only', BASE, head), 'Deletion not authorized')
    local.checked(['git', 'diff', '--check', BASE, head], root)
    return sorted(names)


def verify_public(catalog, data, lookup, page):
    apps = data['apps']
    ids = {str(a['asc_app_id']) for a in apps}
    require(len(apps) == len(ids) == 16, 'Expected exactly 16 unique released apps')
    for country in ('jp', 'us'):
        require(set(lookup[country]) == ids, 'Public membership changed; review required')
    catalog_by_id = {str(a.get('asc_app_id')): a for a in catalog['apps']}
    for app in apps:
        app_id = str(app['asc_app_id']); track = lookup['jp'][app_id]
        require(app['status'] == 'released', 'Non-public version in recovery')
        require(str(track.get('artistId')) == str(catalog['artist_id']), 'Artist identity mismatch')
        require(track.get('bundleId') == app['bundle_id'] == catalog_by_id[app_id]['bundle_id'], 'Bundle identity mismatch')
        fresh = update.build_entry_from_app_store(app, catalog_by_id[app_id], track, 'jp')
        require(fresh == app, f'Published metadata drift: {app["slug"]}')
        if catalog_by_id[app_id].get('auto_onboarded'):
            copy = dict(catalog_by_id[app_id])
            changed = content.refresh_machine_owned_entry(copy, app_id, lookup, ROOT, False)
            require(not changed, f'Machine-owned content drift: {app["slug"]}')
    report = parity.evaluate_parity(lookup, data, catalog, {})
    require(not report['missing'], 'Public-app parity failed')
    rendered = render.replace_json_ld(page, render.build_json_ld(apps))
    for category in render.GRID_CATEGORIES:
        rendered = render.render_grid(rendered, category, apps)
        rendered = render.render_footer(rendered, category, apps)
    require(rendered == page, 'Rendered HTML differs from verified data')
    return report


def perform(root, head, out):
    root = root.resolve(); out = out.resolve()
    require(root == ROOT, 'Execute the verifier from its own repository')
    require(out != root and root not in out.parents, 'Evidence must be outside source tree')
    out.mkdir(parents=True, exist_ok=False)
    result = {'schema': 'allnew.supervised-recovery.v1', 'tier': 'L2', 'result': 'failed',
              'github_actions_run': False, 'autonomous_publication_allowed': False,
              'authority': 'Direct user approval: サイト公開と、提示条件のAzure試行を承認',
              'base': BASE, 'head': head, 'expires_at': DEADLINE.isoformat()}
    try:
        result['paths'] = verify_tree(root, head)
        before = policy_snapshot(root)
        require(before['main'] == BASE, 'Main changed; renewed review required')
        catalog = json.loads((root / 'landing-automation/config/app_catalog.json').read_text())
        data = json.loads((root / 'data/landing-apps.generated.json').read_text())
        lookup = discovery.fetch_artist_lookup(str(catalog['artist_id']))
        cache = discovery.build_lookup_cache(lookup)
        (out / 'public-lookup.json').write_bytes(local.json_bytes(cache))
        result['lookup_sha256'] = local.digest((out / 'public-lookup.json').read_bytes())
        result['parity'] = verify_public(catalog, data, lookup, (root / 'index.html').read_text())
        test = local.run(['python3', '-m', 'pytest', 'landing-automation/tests', '-q'], root)
        (out / 'tests.log').write_bytes(test.stdout + b'\n' + test.stderr)
        require(test.returncode == 0 and re.search(rb'\b[1-9][0-9]* passed\b', test.stdout), 'Executed test suite failed or absent')
        result['tests_sha256'] = local.digest((out / 'tests.log').read_bytes())
        require(verify_tree(root, head) == result['paths'], 'Source changed during verification')
        after = policy_snapshot(root)
        require(before == after, 'Remote policy or main changed during verification')
        result['remote_policy'] = after
        result['artifacts'] = {p: local.digest((root / p).read_bytes()) for p in result['paths']}
        result['verified_at'] = datetime.now(timezone.utc).isoformat()
        result['result'] = 'passed'
        return result
    except Exception as error:
        result['error_type'] = type(error).__name__
        raise
    finally:
        (out / 'report.json').write_bytes(local.json_bytes(result))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reviewed-head', required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    report = perform(ROOT, args.reviewed_head, args.output_dir)
    print(json.dumps({'result': report['result'], 'tier': 'L2', 'head': report['head']}))


if __name__ == '__main__':
    main()

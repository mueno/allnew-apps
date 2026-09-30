from datetime import datetime, timezone
import json
from pathlib import Path
import pytest
import verify_supervised_recovery as recovery
import local_release_publisher as local


def test_scope_excludes_workflow_and_unrelated_pages():
    assert '.github/workflows/deploy.yml' not in recovery.ALLOWED
    assert 'weightsnap/index.html' not in recovery.ALLOWED
    assert len(recovery.ALLOWED) == 10


def test_expired_authority_stops_before_commands(tmp_path):
    with pytest.raises(local.Rejected, match='expired'):
        recovery.verify_tree(tmp_path, 'a'*40, datetime(2026, 10, 2, tzinfo=timezone.utc))


def test_malformed_head_rejected(tmp_path):
    with pytest.raises(local.Rejected, match='Exact'):
        recovery.verify_tree(tmp_path, 'HEAD', datetime(2026, 9, 30, tzinfo=timezone.utc))


@pytest.mark.parametrize('mutation', ['enabled', 'workflow', 'incomplete', 'pages'])
def test_remote_policy_fails_closed(monkeypatch, mutation):
    def api(root, path):
        if path == 'actions/permissions': return {'enabled': mutation == 'enabled'}
        if path.startswith('actions/workflows'): return {'total_count': 2 if mutation == 'incomplete' else 1,
            'workflows': [{'path': '.github/workflows/deploy.yml', 'state': 'active' if mutation == 'workflow' else 'disabled_manually'}]}
        if path == 'pages': return {'build_type': 'legacy' if mutation == 'pages' else 'workflow'}
        raise AssertionError('Must stop before later policy requests')
    monkeypatch.setattr(local, 'api', api)
    with pytest.raises(local.Rejected): recovery.policy_snapshot(Path('.'))


def test_missing_public_app_fails():
    with pytest.raises(local.Rejected, match='16'):
        recovery.verify_public({}, {'apps': []}, {}, '')

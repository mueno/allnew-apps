from __future__ import annotations

from datetime import datetime, timedelta, timezone

import landing_deadman as deadman


def payload_at(observed: datetime):
    return {"workflow_runs": [{"conclusion": "success", "updated_at": observed.isoformat()}]}


def test_recent_success_is_live():
    now = datetime(2026, 9, 2, tzinfo=timezone.utc)
    ok, _detail = deadman.deadman_verdict(payload_at(now - timedelta(hours=11)), at=now)
    assert ok is True


def test_silence_over_twelve_hours_opens_andon_path():
    now = datetime(2026, 9, 2, tzinfo=timezone.utc)
    ok, _detail = deadman.deadman_verdict(payload_at(now - timedelta(hours=13)), at=now)
    assert ok is False


def test_no_success_fails_closed():
    ok, _detail = deadman.deadman_verdict({"workflow_runs": []})
    assert ok is False

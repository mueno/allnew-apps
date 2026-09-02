from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "webhook-relay" / "asc_webhook_relay.py"
SPEC = importlib.util.spec_from_file_location("asc_webhook_relay_test", MODULE_PATH)
assert SPEC and SPEC.loader
relay = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = relay
SPEC.loader.exec_module(relay)


def test_replay_store_survives_new_instance(tmp_path):
    path = tmp_path / "replay.sqlite3"
    first = relay.ReplayStore(path)
    assert first.register("event-1", 3600, now=1000.0) is True

    restarted = relay.ReplayStore(path)
    assert restarted.register("event-1", 3600, now=1001.0) is False


def test_replay_store_allows_event_after_expiry(tmp_path):
    path = tmp_path / "replay.sqlite3"
    store = relay.ReplayStore(path)
    assert store.register("event-1", 10, now=1000.0) is True
    assert store.register("event-1", 10, now=1011.0) is True

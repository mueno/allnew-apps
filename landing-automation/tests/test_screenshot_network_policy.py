"""Network-boundary tests for App Store screenshot downloads."""

from __future__ import annotations

from email.message import Message
from urllib.request import Request

import pytest

import update_landing_data as uld


def test_allowlist_cannot_be_widened_by_environment(monkeypatch) -> None:
    monkeypatch.setenv("LANDING_ALLOWED_SCREENSHOT_DOMAINS", "attacker.example")

    assert uld.is_allowed_screenshot_host("attacker.example") is False


def test_redirect_to_disallowed_host_is_rejected_before_following() -> None:
    handler = uld.ScreenshotRedirectHandler()
    request = Request("https://is1-ssl.mzstatic.com/image.jpg")

    with pytest.raises(ValueError, match="host is not allowed"):
        handler.redirect_request(
            request,
            None,
            302,
            "Found",
            Message(),
            "https://127.0.0.1/internal",
        )


def test_redirect_within_allowlist_remains_supported() -> None:
    handler = uld.ScreenshotRedirectHandler()
    request = Request("https://is1-ssl.mzstatic.com/image.jpg")

    redirected = handler.redirect_request(
        request,
        None,
        302,
        "Found",
        Message(),
        "https://is2-ssl.mzstatic.com/image.jpg",
    )

    assert redirected.full_url == "https://is2-ssl.mzstatic.com/image.jpg"

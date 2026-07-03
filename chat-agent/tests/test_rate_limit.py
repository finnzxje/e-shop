from __future__ import annotations

from app.services.rate_limit_service import RateLimiter


def test_first_request_allowed(monkeypatch):
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_PER_WINDOW", "5")
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_WINDOW_SECONDS", "60")
    limiter = RateLimiter()
    allowed, retry = limiter.consume("1.2.3.4")
    assert allowed is True
    assert retry == 0.0


def test_blocks_after_limit(monkeypatch):
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_PER_WINDOW", "3")
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_WINDOW_SECONDS", "60")
    limiter = RateLimiter()
    for _ in range(3):
        assert limiter.consume("1.2.3.4")[0] is True
    allowed, retry = limiter.consume("1.2.3.4")
    assert allowed is False
    assert retry > 0


def test_separate_keys_have_separate_buckets(monkeypatch):
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_PER_WINDOW", "2")
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_WINDOW_SECONDS", "60")
    limiter = RateLimiter()
    assert limiter.consume("1.2.3.4")[0] is True
    assert limiter.consume("1.2.3.4")[0] is True
    assert limiter.consume("1.2.3.4")[0] is False
    # Different IP — still allowed.
    assert limiter.consume("5.6.7.8")[0] is True


def test_disabled_via_env(monkeypatch):
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_ENABLED", "false")
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_PER_WINDOW", "1")
    limiter = RateLimiter()
    for _ in range(20):
        assert limiter.consume("1.2.3.4")[0] is True


def test_empty_key_bypasses_limit(monkeypatch):
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_PER_WINDOW", "1")
    limiter = RateLimiter()
    assert limiter.consume("")[0] is True
    assert limiter.consume("")[0] is True


def test_reset_clears_bucket(monkeypatch):
    monkeypatch.setenv("CHAT_AGENT_RATE_LIMIT_PER_WINDOW", "2")
    limiter = RateLimiter()
    limiter.consume("1.2.3.4")
    limiter.consume("1.2.3.4")
    assert limiter.consume("1.2.3.4")[0] is False
    limiter.reset("1.2.3.4")
    assert limiter.consume("1.2.3.4")[0] is True

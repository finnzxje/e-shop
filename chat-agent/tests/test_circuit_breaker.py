from __future__ import annotations

import time

from app.services.circuit_breaker import CircuitBreaker


def _breaker(threshold: int = 3, cooldown: float = 0.5) -> CircuitBreaker:
    return CircuitBreaker(name="test", failure_threshold=threshold, cooldown_seconds=cooldown)


def test_closed_when_fresh():
    b = _breaker()
    assert b.is_open() is False


def test_opens_after_threshold_failures():
    b = _breaker(threshold=3)
    for _ in range(3):
        b.record_failure()
    assert b.is_open() is True


def test_below_threshold_stays_closed():
    b = _breaker(threshold=3)
    b.record_failure()
    b.record_failure()
    assert b.is_open() is False


def test_success_resets_consecutive_count():
    b = _breaker(threshold=3)
    b.record_failure()
    b.record_failure()
    b.record_success()
    # After reset, two more failures should NOT trip the breaker (still <3).
    b.record_failure()
    b.record_failure()
    assert b.is_open() is False


def test_breaker_closes_after_cooldown():
    b = _breaker(threshold=2, cooldown=0.2)
    b.record_failure()
    b.record_failure()
    assert b.is_open() is True
    time.sleep(0.25)
    assert b.is_open() is False


def test_reset_clears_state():
    b = _breaker(threshold=2)
    b.record_failure()
    b.record_failure()
    assert b.is_open() is True
    b.reset()
    assert b.is_open() is False

from __future__ import annotations

import os
import threading
import time

from app.services.logging_service import log_event


class CircuitBreaker:
    def __init__(
        self,
        *,
        name: str,
        failure_threshold: int,
        cooldown_seconds: float,
    ) -> None:
        self.name = name
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self._lock = threading.Lock()
        self._consecutive_failures = 0
        self._open_until: float = 0.0

    def is_open(self) -> bool:
        with self._lock:
            return time.time() < self._open_until

    def record_success(self) -> None:
        with self._lock:
            self._consecutive_failures = 0
            self._open_until = 0.0

    def record_failure(self) -> None:
        with self._lock:
            self._consecutive_failures += 1
            if (
                self._consecutive_failures >= self.failure_threshold
                and time.time() >= self._open_until
            ):
                self._open_until = time.time() + self.cooldown_seconds
                log_event(
                    "circuit_breaker_opened",
                    breakerName=self.name,
                    cooldownSeconds=self.cooldown_seconds,
                    consecutiveFailures=self._consecutive_failures,
                )

    def reset(self) -> None:
        with self._lock:
            self._consecutive_failures = 0
            self._open_until = 0.0


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


openai_breaker = CircuitBreaker(
    name="openai",
    failure_threshold=_int_env("OPENAI_CIRCUIT_FAILURE_THRESHOLD", 3),
    cooldown_seconds=_float_env("OPENAI_CIRCUIT_COOLDOWN_SECONDS", 30.0),
)

from __future__ import annotations

import os
import threading
import time
from collections import deque
from typing import Deque


def _window_seconds() -> float:
    return float(os.getenv("CHAT_AGENT_RATE_LIMIT_WINDOW_SECONDS", "60"))


def _max_requests() -> int:
    return int(os.getenv("CHAT_AGENT_RATE_LIMIT_PER_WINDOW", "30"))


def _enabled() -> bool:
    value = os.getenv("CHAT_AGENT_RATE_LIMIT_ENABLED", "true").lower()
    return value in {"1", "true", "yes"}


class RateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._buckets: dict[str, Deque[float]] = {}

    def consume(self, key: str) -> tuple[bool, float]:
        if not _enabled() or not key:
            return True, 0.0
        window = _window_seconds()
        max_requests = _max_requests()
        now = time.monotonic()
        cutoff = now - window
        with self._lock:
            bucket = self._buckets.setdefault(key, deque())
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= max_requests:
                retry_after = max(0.0, bucket[0] + window - now)
                return False, retry_after
            bucket.append(now)
            return True, 0.0

    def reset(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._buckets.clear()
            else:
                self._buckets.pop(key, None)

    def size(self) -> int:
        with self._lock:
            return len(self._buckets)


rate_limiter = RateLimiter()

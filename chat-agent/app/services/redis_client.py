from __future__ import annotations

import os
import threading

import redis

from app.services.logging_service import log_event


_lock = threading.Lock()
_client: redis.Redis | None = None
_last_error_logged = False


def _redis_url() -> str:
    return os.getenv("REDIS_URL", "redis://redis:6379/0")


def get_client() -> redis.Redis | None:
    """Return a lazily-initialized Redis client, or None when Redis is unreachable.

    Every caller must be ready for None so response_cache and memory_service
    can transparently fall back to their in-memory dict shims.
    """
    global _client, _last_error_logged
    if _client is not None:
        return _client
    with _lock:
        if _client is not None:
            return _client
        try:
            client = redis.from_url(
                _redis_url(),
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
            )
            client.ping()
            _client = client
            if _last_error_logged:
                log_event("redis_reconnected", url=_redis_url())
                _last_error_logged = False
            return _client
        except Exception as exc:
            if not _last_error_logged:
                log_event("redis_unavailable", error=f"{exc.__class__.__name__}: {exc}")
                _last_error_logged = True
            return None


def reset() -> None:
    """Drop the cached client so the next get_client() re-connects. Used in tests."""
    global _client, _last_error_logged
    with _lock:
        _client = None
        _last_error_logged = False

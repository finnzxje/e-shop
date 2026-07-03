from __future__ import annotations

import os
import time

import pytest
from fastapi.testclient import TestClient

from app.services import response_cache


@pytest.fixture(autouse=True)
def _reset_cache():
    response_cache.clear()
    yield
    response_cache.clear()


def test_put_and_get_cacheable_intent():
    response_cache.put("Return policy?", "policy_or_faq", {"answer": "ok"})
    assert response_cache.get("Return policy?") == {"answer": "ok"}


def test_get_normalizes_message():
    response_cache.put("Return Policy", "policy_or_faq", {"answer": "ok"})
    # Whitespace + case variations should hit the same key.
    assert response_cache.get("return  policy") == {"answer": "ok"}
    assert response_cache.get("  RETURN POLICY  ") == {"answer": "ok"}


def test_put_skips_non_cacheable_intent():
    response_cache.put("Show me jackets", "product_search", {"answer": "ok"})
    assert response_cache.get("Show me jackets") is None


def test_put_skips_order_status():
    response_cache.put("Where is my order", "order_status", {"answer": "ok"})
    assert response_cache.get("Where is my order") is None


def test_authenticated_state_is_part_of_key():
    response_cache.put("Hello", "general", {"answer": "anon"}, authenticated=False)
    response_cache.put("Hello", "general", {"answer": "auth"}, authenticated=True)
    assert response_cache.get("Hello", authenticated=False) == {"answer": "anon"}
    assert response_cache.get("Hello", authenticated=True) == {"answer": "auth"}


def test_ttl_expires_entries(monkeypatch):
    monkeypatch.setenv("RESPONSE_CACHE_TTL_SECONDS", "1")
    response_cache.put("Return policy", "policy_or_faq", {"answer": "ok"})
    assert response_cache.get("Return policy") is not None
    time.sleep(1.1)
    assert response_cache.get("Return policy") is None


def test_clear_removes_all_entries():
    response_cache.put("a", "policy_or_faq", {"answer": "1"})
    response_cache.put("b", "general", {"answer": "2"})
    assert response_cache.size() == 2
    response_cache.clear()
    assert response_cache.size() == 0


def test_cache_disabled_via_env(monkeypatch):
    monkeypatch.setenv("RESPONSE_CACHE_ENABLED", "false")
    response_cache.put("Return policy", "policy_or_faq", {"answer": "ok"})
    assert response_cache.get("Return policy") is None


def test_chat_endpoint_serves_cached_response():
    os.environ.setdefault("MOCK_BACKEND", "true")
    from app.main import app

    client = TestClient(app)

    # First call runs the full graph and seeds the cache.
    r1 = client.post(
        "/agent/chat",
        json={"sessionId": "cache-session-1", "message": "What is your return policy?"},
    )
    assert r1.status_code == 200
    body1 = r1.json()
    assert body1["intent"] in {"policy_or_faq", "general"}

    # Second call with the same message but a different sessionId must come
    # from cache AND echo back the new sessionId (not the cached one).
    r2 = client.post(
        "/agent/chat",
        json={"sessionId": "cache-session-2", "message": "What is your return policy?"},
    )
    assert r2.status_code == 200
    body2 = r2.json()
    assert body2["sessionId"] == "cache-session-2"
    # Cached payload should return the same answer text.
    assert body2["answer"] == body1["answer"]

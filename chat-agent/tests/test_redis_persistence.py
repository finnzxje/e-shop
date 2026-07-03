from __future__ import annotations

from unittest.mock import patch

import fakeredis
import pytest

from app.schemas import ProductCard
from app.services import redis_client
from app.services.memory_service import MemoryService
from app.services import response_cache


@pytest.fixture(autouse=True)
def _fake_redis():
    fake = fakeredis.FakeRedis(decode_responses=True)
    with patch.object(redis_client, "_client", None):
        with patch("app.services.redis_client.redis.from_url", return_value=fake):
            yield fake
    redis_client.reset()
    response_cache.clear()


def _product(pid: str = "p1", category: str = "jackets") -> ProductCard:
    return ProductCard(
        productId=pid,
        name=f"Test {pid}",
        slug=f"test-{pid}",
        category=category,
        gender="unisex",
        price=100,
        currency="USD",
        inStock=True,
    )


def test_response_cache_persists_in_redis(_fake_redis):
    response_cache.put("Return policy?", "policy_or_faq", {"answer": "30 days"})
    keys = list(_fake_redis.scan_iter(match="chat:response_cache:*"))
    assert len(keys) == 1
    assert response_cache.get("Return policy?") == {"answer": "30 days"}


def test_response_cache_survives_process_state_reset(_fake_redis):
    response_cache.put("Shipping policy", "policy_or_faq", {"answer": "3 days"})
    # Simulate process restart: local in-memory dict wiped, Redis keeps data.
    response_cache._store.clear()
    assert response_cache.get("Shipping policy") == {"answer": "3 days"}


def test_response_cache_uncacheable_intent_not_stored(_fake_redis):
    response_cache.put("show jackets", "product_search", {"answer": "..."})
    keys = list(_fake_redis.scan_iter(match="chat:response_cache:*"))
    assert keys == []


def test_memory_service_persists_across_new_instance(_fake_redis):
    svc_a = MemoryService()
    svc_a.update(
        "session-1",
        products=[_product("p1", "jackets")],
        tool_results=[],
        intent="product_search",
        assistant_response="here are jackets",
    )
    # Simulate container restart: new instance, in-memory dict empty, but Redis
    # still carries the session.
    svc_b = MemoryService()
    memory = svc_b.get("session-1")
    assert memory.last_intent == "product_search"
    assert len(memory.previous_products) == 1
    assert memory.previous_products[0].category == "jackets"


def test_memory_service_updates_persist_to_redis(_fake_redis):
    svc = MemoryService()
    svc.update(
        "session-x",
        products=[_product("p1")],
        tool_results=[{"tool": "catalog", "status": "success"}],
        intent="recommendation",
        assistant_response="reply",
    )
    keys = list(_fake_redis.scan_iter(match="chat:session_memory:*"))
    assert any("session-x" in k for k in keys)


def test_fallback_to_memory_when_redis_unavailable():
    # Force redis_client to return None (unavailable).
    redis_client.reset()
    with patch("app.services.redis_client.redis.from_url", side_effect=ConnectionError("boom")):
        response_cache.put("faq q", "policy_or_faq", {"answer": "ok"})
        # Still readable via in-memory fallback.
        assert response_cache.get("faq q") == {"answer": "ok"}
    response_cache.clear()
    redis_client.reset()

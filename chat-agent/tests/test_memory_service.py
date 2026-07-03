from __future__ import annotations

import time

import pytest

from app.schemas import ProductCard
from app.services.memory_service import MemoryService


@pytest.fixture
def svc(monkeypatch):
    monkeypatch.setenv("SESSION_MEMORY_TTL_SECONDS", "60")
    monkeypatch.setenv("SESSION_MEMORY_MAX_SIZE", "100")
    return MemoryService()


def _product(pid: str = "p1") -> ProductCard:
    return ProductCard(
        productId=pid,
        name="Test",
        slug="test",
        category="shoes",
        gender="unisex",
        price=10,
        currency="USD",
        inStock=True,
    )


def test_get_creates_fresh_memory(svc):
    mem = svc.get("s1")
    assert mem.last_intent is None
    assert mem.previous_products == []


def test_update_then_get_returns_same_memory(svc):
    svc.update(
        "s1",
        products=[_product()],
        tool_results=[],
        intent="product_search",
        assistant_response="hi",
    )
    mem = svc.get("s1")
    assert mem.last_intent == "product_search"
    assert len(mem.previous_products) == 1


def test_session_expires_after_ttl(monkeypatch):
    monkeypatch.setenv("SESSION_MEMORY_TTL_SECONDS", "1")
    monkeypatch.setenv("SESSION_MEMORY_MAX_SIZE", "100")
    svc = MemoryService()
    svc.update(
        "s1",
        products=[_product()],
        tool_results=[],
        intent="product_search",
        assistant_response="hi",
    )
    assert svc.get("s1").last_intent == "product_search"
    time.sleep(1.1)
    fresh = svc.get("s1")
    assert fresh.last_intent is None
    assert fresh.previous_products == []


def test_size_cap_evicts_oldest(monkeypatch):
    monkeypatch.setenv("SESSION_MEMORY_TTL_SECONDS", "3600")
    monkeypatch.setenv("SESSION_MEMORY_MAX_SIZE", "3")
    svc = MemoryService()
    for sid in ["s1", "s2", "s3"]:
        svc.update(
            sid,
            products=[_product(sid)],
            tool_results=[],
            intent="product_search",
            assistant_response=sid,
        )
        time.sleep(0.01)
    assert svc.size() == 3
    svc.update(
        "s4",
        products=[_product("s4")],
        tool_results=[],
        intent="product_search",
        assistant_response="s4",
    )
    assert svc.size() <= 3
    assert svc.get("s4").last_intent == "product_search"
    assert svc.get("s1").last_intent is None


def test_get_refreshes_ttl(monkeypatch):
    monkeypatch.setenv("SESSION_MEMORY_TTL_SECONDS", "2")
    monkeypatch.setenv("SESSION_MEMORY_MAX_SIZE", "100")
    svc = MemoryService()
    svc.update(
        "s1",
        products=[_product()],
        tool_results=[],
        intent="product_search",
        assistant_response="hi",
    )
    time.sleep(1.2)
    assert svc.get("s1").last_intent == "product_search"
    time.sleep(1.2)
    assert svc.get("s1").last_intent == "product_search"


def test_clear_empties_store(svc):
    svc.update(
        "s1",
        products=[_product()],
        tool_results=[],
        intent="product_search",
        assistant_response="hi",
    )
    assert svc.size() == 1
    svc.clear()
    assert svc.size() == 0

from __future__ import annotations

import os
import threading
from unittest.mock import patch

import pytest

from app.schemas import DraftAction, ProductCard
from app.services import grounding_check_service
from app.services.memory_service import MemoryService


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


def test_grounding_check_fails_closed_on_exception():
    class _BoomClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, *args, **kwargs):
            raise TimeoutError("simulated upstream timeout")

    with patch.dict(os.environ, {"LLM_ENABLED": "true", "OPENAI_API_KEY": "sk-test"}, clear=False):
        with patch.object(grounding_check_service.httpx, "Client", _BoomClient):
            grounded, reason = grounding_check_service.is_answer_grounded(
                answer="Free lifetime warranty on everything.",
                grounding_documents=[{"sourceId": "x", "body": "Returns within 30 days."}],
            )

    assert grounded is False
    assert reason == "grounding_check_unavailable"


def test_memory_update_is_atomic_under_concurrency(monkeypatch):
    monkeypatch.setenv("SESSION_MEMORY_TTL_SECONDS", "3600")
    monkeypatch.setenv("SESSION_MEMORY_MAX_SIZE", "100")
    svc = MemoryService()
    session_id = "race-session"
    iterations = 200

    def worker_a():
        for _ in range(iterations):
            svc.update(
                session_id,
                products=[_product("A")],
                tool_results=[],
                intent="product_search",
                assistant_response="A",
            )

    def worker_b():
        for _ in range(iterations):
            svc.update(
                session_id,
                products=[_product("B")],
                tool_results=[],
                intent="recommendation",
                assistant_response="B",
            )

    t1 = threading.Thread(target=worker_a)
    t2 = threading.Thread(target=worker_b)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    final = svc.get(session_id)
    # Whichever thread wrote last wins; the invariant is that intent and product
    # must come from the same write (not mixed A's products with B's intent).
    if final.last_intent == "product_search":
        assert final.previous_products[0].product_id == "A"
    else:
        assert final.last_intent == "recommendation"
        assert final.previous_products[0].product_id == "B"


def test_output_guardrails_returns_new_draft_action_instance(monkeypatch):
    from datetime import datetime, timezone

    from app.graph.nodes import output_guardrails

    original = DraftAction(
        draftActionId="da-1",
        actionType="cart.add",
        payload={"productId": "p1"},
        status="pending",
        expiresAt=datetime.now(timezone.utc),
        needsConfirmation=False,
    )

    state = {"draft_action": original, "node_trace": []}
    result = output_guardrails(state)

    assert result["draft_action"] is not original
    assert result["draft_action"].needs_confirmation is True
    assert original.needs_confirmation is False

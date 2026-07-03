from __future__ import annotations

import os
from unittest.mock import patch

from app.services import llm_service


def test_empty_llm_answer_returns_error_on_result():
    fake_response_body = {"choices": [{"message": {"content": "   "}}]}

    class _StubClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, *args, **kwargs):
            class _Resp:
                def raise_for_status(self_inner):
                    return None

                def json(self_inner):
                    return fake_response_body

            return _Resp()

    with patch.dict(os.environ, {"LLM_ENABLED": "true", "OPENAI_API_KEY": "sk-test"}, clear=False):
        with patch.object(llm_service.httpx, "Client", _StubClient):
            result = llm_service.generate_grounded_answer(
                message="hi",
                intent="general",
                response_type="answer",
                current_answer="Hello there.",
            )

    assert result.used is False
    assert result.error is not None
    assert "empty" in result.error.lower()
    # Caller relies on result.error being truthy to set needs_review.
    assert result.answer == "Hello there."


def test_refine_node_flags_review_when_llm_returns_empty():
    from app.graph.nodes import refine_grounded_answer_with_llm
    from app.services.llm_service import LlmResult

    state = {
        "message": "hi",
        "intent": "general",
        "response_type": "answer",
        "answer": "Hello there.",
        "product_cards": [],
        "grounding_documents": [],
        "tool_calls": [],
        "node_trace": [],
    }

    with patch(
        "app.graph.nodes.generate_grounded_answer",
        return_value=LlmResult(answer="Hello there.", used=False, error="empty llm answer"),
    ):
        updates = refine_grounded_answer_with_llm(state)

    assert updates.get("needs_review") is True

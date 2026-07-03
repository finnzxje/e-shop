from __future__ import annotations

import os

import pytest
from pydantic import ValidationError

import app.graph.nodes as graph_nodes
from app.clients.base_client import BackendClientError
from app.tools.catalog_tool import CatalogTool
os.environ["LANGSMITH_TRACING"] = "false"

from app.main import chat, health
from app.schemas import AgentChatRequest


class AgentApiTestResponse:
    def __init__(self, body: dict) -> None:
        self.status_code = 200
        self._body = body

    def json(self) -> dict:
        return self._body


class AgentApiTestClient:
    def post(self, path: str, json: dict) -> AgentApiTestResponse:
        assert path == "/agent/chat"
        response = chat(AgentChatRequest(**json))
        return AgentApiTestResponse(response.model_dump(by_alias=True))


client = AgentApiTestClient()


def test_health() -> None:
    assert health() == {"status": "ok", "service": "chat-agent"}


def test_chat_schema() -> None:
    response = chat(AgentChatRequest(sessionId="schema-test", message="hello"))
    body = response.model_dump(by_alias=True)

    assert body["sessionId"] == "schema-test"
    assert body["traceId"].startswith("trace_")
    assert body["intent"] == "general"
    assert body["responseType"] == "answer"
    assert "answer" in body
    assert isinstance(body["productCards"], list)
    assert isinstance(body["toolCalls"], list)
    assert body["needsConfirmation"] is False


def test_product_search_returns_cards() -> None:
    response = chat(AgentChatRequest(sessionId="product-test", message="ao size M mau den con hang khong?"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "product_search"
    assert body["responseType"] == "product_results"
    assert body["productCards"]
    assert body["productCards"][0]["productId"]
    assert body["productCards"][0]["inStock"] is True
    assert body["toolCalls"][0]["toolName"] == "catalog.search"


def test_cart_draft_needs_confirmation() -> None:
    response = chat(AgentChatRequest(sessionId="cart-test", message="add jacket size M to cart"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "cart_action"
    assert body["responseType"] == "draft_action"
    assert body["needsConfirmation"] is True
    assert body["draftAction"]["actionType"] == "cart.add"
    assert body["draftAction"]["status"] == "pending"
    assert body["draftAction"]["expiresAt"]
    assert body["draftAction"]["needsConfirmation"] is True
    assert body["draftAction"]["payload"]["quantity"] == 1


def test_unauthenticated_order_requires_sign_in() -> None:
    response = chat(
        AgentChatRequest(
            sessionId="order-test",
            message="check order ES123",
            authenticated=False,
        )
    )
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "order_status"
    assert body["responseType"] == "auth_required"
    assert "sign in" in body["answer"].lower()
    assert body["toolCalls"] == []


def test_latest_order_english_uses_order_list() -> None:
    response = chat(
        AgentChatRequest(
            sessionId="latest-order-english",
            message="latest order",
            authenticated=True,
            userId="user-1",
        )
    )
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "order_status"
    assert body["responseType"] == "order_status"
    assert body["slots"]["order_id"] == "latest"
    assert body["toolCalls"][0]["toolName"] == "order.list"


def test_signed_in_order_followup_does_not_route_to_login_faq() -> None:
    response = chat(
        AgentChatRequest(
            sessionId="signed-in-order-followup",
            message="I already signed in, check my order",
            authenticated=True,
            userId="user-1",
        )
    )
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "order_status"
    assert body["responseType"] == "clarification"
    assert body["toolCalls"] == []


def test_variant_cart_reference_creates_draft() -> None:
    session_id = "variant-cart-reference"
    first = chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))
    first_body = first.model_dump(by_alias=True)

    response = chat(AgentChatRequest(sessionId=session_id, message="add this variant to my cart"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "cart_action"
    assert body["responseType"] == "draft_action"
    assert body["draftAction"]["actionType"] == "cart.add"
    assert body["draftAction"]["payload"]["productId"] == first_body["productCards"][0]["productId"]


def test_empty_message_accepted_at_schema_level() -> None:
    # Empty messages used to raise ValidationError. The endpoint now handles
    # them with a friendly prompt; see tests/test_empty_input.py for the HTTP
    # contract.
    request = AgentChatRequest(sessionId="empty-test", message="")
    assert request.message == ""


def test_recommendation_flow_uses_previous_products() -> None:
    session_id = "recommend-session"
    chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))

    response = chat(AgentChatRequest(sessionId=session_id, message="goi y san pham tuong tu"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "recommendation"
    assert body["responseType"] == "recommendations"
    assert body["productCards"]
    assert body["productCards"][0]["recommendationRank"] == 1
    assert body["productCards"][0]["recommendationScore"] > 0
    assert body["productCards"][0]["recommendationReason"]
    assert body["toolCalls"][0]["toolName"] == "recommend.similar"
    assert "rankedRecommendations=" in body["toolCalls"][0]["responseSummary"]


def test_vietnamese_accented_similar_request_uses_normalized_message() -> None:
    session_id = "recommend-accent-session"
    chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))

    response = chat(AgentChatRequest(sessionId=session_id, message="gợi ý sản phẩm tương tự"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "recommendation"
    assert body["responseType"] == "recommendations"
    assert body["toolCalls"][0]["toolName"] == "recommend.similar"


def test_generic_recommendation_uses_personalized_tool() -> None:
    response = chat(AgentChatRequest(sessionId="personalized-recommend-session", message="recommend something for me"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "recommendation"
    assert body["responseType"] == "recommendations"
    assert body["productCards"]
    assert body["productCards"][0]["recommendationRank"] == 1
    assert body["productCards"][0]["recommendationScore"] > 0
    assert body["productCards"][0]["recommendationReason"]
    assert body["toolCalls"][0]["toolName"] == "recommend.personalized"
    assert "rankedRecommendations=" in body["toolCalls"][0]["responseSummary"]


@pytest.mark.parametrize("status", ["empty_result", "timeout"])
def test_recommendation_falls_back_to_catalog_cards(monkeypatch: pytest.MonkeyPatch, status: str) -> None:
    class FailingRecommendation:
        def similar(self, product_id=None, variant_id=None, recent_product_ids=None):
            return graph_nodes.ToolResult(status=status, data=[], summary=f"recommendation {status}")

    monkeypatch.setattr(graph_nodes.tools, "recommendation", FailingRecommendation())
    session_id = f"recommend-fallback-{status}"
    chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))

    response = chat(AgentChatRequest(sessionId=session_id, message="goi y san pham tuong tu"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "recommendation"
    assert body["responseType"] == "recommendations"
    assert body["productCards"]
    assert body["fallbackCount"] == 1
    # After the recommender fails, chat-agent now tries a CLIP semantic
    # search (recommend.by_text) before the random-popular catalog fallback.
    # The mock does not implement by_text, so call_tool records it as a
    # backend_error and the flow proceeds to catalog.search.
    tool_names = [tool["toolName"] for tool in body["toolCalls"]]
    assert tool_names == ["recommend.similar", "recommend.by_text", "catalog.search"]
    assert body["toolCalls"][0]["status"] == status
    assert body["toolCalls"][-1]["status"] == "success"


def test_personalized_recommendation_falls_back_to_catalog_cards(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingRecommendation:
        def personalized(self, user_id=None, recent_product_ids=None):
            return graph_nodes.ToolResult(status="empty_result", data=[], summary="0 personalized recommendations")

    monkeypatch.setattr(graph_nodes.tools, "recommendation", FailingRecommendation())

    response = chat(AgentChatRequest(sessionId="personalized-fallback", message="recommend something for me"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "recommendation"
    assert body["responseType"] == "recommendations"
    assert body["productCards"]
    assert body["fallbackCount"] == 1
    tool_names = [tool["toolName"] for tool in body["toolCalls"]]
    assert tool_names == ["recommend.personalized", "recommend.by_text", "catalog.search"]
    assert body["toolCalls"][0]["status"] == "empty_result"
    assert body["toolCalls"][-1]["status"] == "success"


def test_follow_up_contextual_cart_reference() -> None:
    session_id = "context-cart-session"
    first = chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))
    first_body = first.model_dump(by_alias=True)

    response = chat(AgentChatRequest(sessionId=session_id, message="them cai dau tien vao gio"))
    body = response.model_dump(by_alias=True)

    assert body["responseType"] == "draft_action"
    assert body["draftAction"]["payload"]["productId"] == first_body["productCards"][0]["productId"]
    assert body["draftAction"]["needsConfirmation"] is True


def test_follow_up_contextual_cart_reference_preserves_variant_id(monkeypatch: pytest.MonkeyPatch) -> None:
    class VariantCatalogClient:
        @staticmethod
        def _product() -> dict:
            return [
                {
                    "productId": "p-variant-1",
                    "variantId": "v-variant-1",
                    "name": "Variant Jacket",
                    "slug": "variant-jacket",
                    "category": "jackets",
                    "gender": "women",
                    "price": 490000,
                    "currency": "VND",
                    "imageUrl": "https://example.com/jacket.jpg",
                    "colors": ["black"],
                    "sizes": ["M"],
                    "inStock": True,
                    "stock": 5,
                }
            ][0]

        def catalog_search(self, query: str, filters: dict | None = None) -> list[dict]:
            return [self._product()]

        def catalog_filter(self, filters: dict) -> list[dict]:
            return [self._product()]

        def catalog_detail(self, slug: str) -> dict | None:
            product = self._product()
            return product if slug == product["slug"] else None

    monkeypatch.setattr(graph_nodes.tools, "catalog", CatalogTool(VariantCatalogClient()))

    session_id = "context-cart-variant-session"
    first = chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))
    first_body = first.model_dump(by_alias=True)

    response = chat(AgentChatRequest(sessionId=session_id, message="them cai dau tien vao gio"))
    body = response.model_dump(by_alias=True)

    assert first_body["productCards"][0]["variantId"]
    assert body["draftAction"]["payload"]["variantId"] == first_body["productCards"][0]["variantId"]


def test_remove_cart_draft_contextual_reference() -> None:
    session_id = "remove-cart-session"
    first = chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))
    first_body = first.model_dump(by_alias=True)

    response = chat(AgentChatRequest(sessionId=session_id, message="xoa san pham nay"))
    body = response.model_dump(by_alias=True)

    assert body["responseType"] == "draft_action"
    assert body["draftAction"]["actionType"] == "cart.remove_item"
    assert body["draftAction"]["payload"]["productId"] == first_body["productCards"][0]["productId"]


def test_update_quantity_cart_draft_contextual_reference() -> None:
    session_id = "update-cart-session"
    first = chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))
    first_body = first.model_dump(by_alias=True)

    response = chat(AgentChatRequest(sessionId=session_id, message="tang so luong len 2"))
    body = response.model_dump(by_alias=True)

    assert body["responseType"] == "draft_action"
    assert body["draftAction"]["actionType"] == "cart.update_quantity"
    assert body["draftAction"]["payload"]["quantity"] == 2
    assert body["draftAction"]["payload"]["productId"] == first_body["productCards"][0]["productId"]


def test_current_product_reference_in_vietnamese() -> None:
    session_id = "current-product-session"
    first = chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))
    first_body = first.model_dump(by_alias=True)

    response = chat(AgentChatRequest(sessionId=session_id, message="them san pham do vao gio"))
    body = response.model_dump(by_alias=True)

    assert body["responseType"] == "draft_action"
    assert body["draftAction"]["payload"]["productId"] == first_body["productCards"][0]["productId"]


def test_pronoun_remove_reference() -> None:
    session_id = "pronoun-product-session"
    first = chat(AgentChatRequest(sessionId=session_id, message="ao khoac den size M"))
    first_body = first.model_dump(by_alias=True)

    response = chat(AgentChatRequest(sessionId=session_id, message="xoa no di"))
    body = response.model_dump(by_alias=True)

    assert body["responseType"] == "draft_action"
    assert body["draftAction"]["actionType"] == "cart.remove_item"
    assert body["draftAction"]["payload"]["productId"] == first_body["productCards"][0]["productId"]


def test_support_handoff_draft_needs_confirmation() -> None:
    response = chat(AgentChatRequest(sessionId="support-session", message="toi muon gap nhan vien ho tro"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "support_handoff"
    assert body["responseType"] == "handoff"
    assert body["needsConfirmation"] is True
    assert body["draftAction"]["actionType"] == "support.handoff"
    assert body["draftAction"]["status"] == "pending"


def test_empty_result_handling() -> None:
    response = chat(AgentChatRequest(sessionId="empty-result", message="giay nam duoi 500k"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "product_search"
    assert body["responseType"] == "empty_result"
    assert body["fallbackCount"] == 1


def test_tool_timeout_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    class TimeoutCatalog:
        def search(self, query, filters=None):
            raise BackendClientError("timeout", status="timeout")

    monkeypatch.setattr(graph_nodes.tools, "catalog", TimeoutCatalog())

    response = chat(AgentChatRequest(sessionId="timeout-session", message="ao den size M"))
    body = response.model_dump(by_alias=True)

    assert body["responseType"] == "tool_error"
    assert body["toolCalls"][0]["status"] == "timeout"
    assert body["toolCalls"][0]["requestSummary"]
    assert body["toolCalls"][0]["responseSummary"] == "backend client error"
    assert body["fallbackCount"] == 1


def test_policy_answer_tool_trace_includes_source_metadata() -> None:
    response = chat(AgentChatRequest(sessionId="policy-source-trace", message="shipping fees standard domestic"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "policy_or_faq"
    assert body["responseType"] == "answer"
    assert body["toolCalls"][0]["toolName"] == "knowledge.retrieve"
    assert "sourceIds=shipping" in body["toolCalls"][0]["responseSummary"]


def test_llm_refinement_can_rewrite_grounded_read_only_answers(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeLlmResult:
        answer = "LLM grounded answer from shipping source."
        used = True
        error = None

    def fake_generate_grounded_answer(**kwargs):
        assert kwargs["response_type"] == "answer"
        assert kwargs["grounding_documents"][0]["sourceId"] == "shipping"
        return FakeLlmResult()

    monkeypatch.setattr(graph_nodes, "generate_grounded_answer", fake_generate_grounded_answer)

    response = chat(AgentChatRequest(sessionId="llm-refine", message="shipping fees standard domestic"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "policy_or_faq"
    assert body["answer"] == "LLM grounded answer from shipping source."
    assert body["toolCalls"][0]["toolName"] == "knowledge.retrieve"


def test_product_knowledge_question_returns_empty_result_with_topics() -> None:
    # Product knowledge lives in the recommender (product_variants_v1, CLIP),
    # not in chat-agent's knowledge_documents_v1. A FAQ-style product question
    # routed to policy_or_faq must surface no match and suggest the FAQ topics
    # we actually own, instead of returning stale product knowledge.
    response = chat(
        AgentChatRequest(
            sessionId="product-knowledge-source",
            message="is the torrentshell jacket waterproof and how do i care for it",
        )
    )
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "policy_or_faq"
    assert body["responseType"] == "empty_result"
    assert body["toolCalls"][0]["toolName"] == "knowledge.retrieve"
    assert "Try one of" in body["answer"]


def test_low_confidence_policy_retrieval_falls_back() -> None:
    response = chat(AgentChatRequest(sessionId="policy-low-confidence", message="return carbon bicycle frame warranty"))
    body = response.model_dump(by_alias=True)

    assert body["intent"] == "policy_or_faq"
    assert body["responseType"] == "empty_result"
    assert body["toolCalls"][0]["toolName"] == "knowledge.retrieve"
    assert body["fallbackCount"] == 1


def test_recommendation_fallback_trace_includes_reason(monkeypatch: pytest.MonkeyPatch) -> None:
    class TimeoutRecommendation:
        def personalized(self, user_id=None, recent_product_ids=None):
            return graph_nodes.ToolResult(status="timeout", data=[], summary="recommendation timeout")

    monkeypatch.setattr(graph_nodes.tools, "recommendation", TimeoutRecommendation())

    response = client.post(
        "/agent/chat",
        json={"sessionId": "fallback-reason-session", "message": "recommend timeout fallback"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["responseType"] == "recommendations"
    fallback_tool = next(tool for tool in body["toolCalls"] if tool["toolName"] == "catalog.search")
    assert fallback_tool["input"]["fallbackFor"] == "recommend.personalized"
    assert fallback_tool["input"]["fallbackReason"] == "recommend.personalized returned timeout"
    assert body["fallbackCount"] == 1
    # A single fallback with a confident intent is expected behaviour and no
    # longer floods the review queue — see _needs_review in nodes.py.
    assert body["needsReview"] is False

from __future__ import annotations

from app.graph import nodes as graph_nodes
from app.tools.base import ToolResult
from evaluation import evaluate_cases, load_cases


def test_phase3_evaluation_dataset_passes_baseline() -> None:
    result = evaluate_cases(load_cases())

    failed = [case for case in result.case_results if not case["passed"]]
    assert failed == []
    assert result.metrics["total_cases"] >= 8
    assert result.metrics["intent_accuracy"] == 1.0
    assert result.metrics["slot_extraction_pass_rate"] == 1.0
    assert result.metrics["tool_selection_pass_rate"] == 1.0
    assert result.metrics["schema_validity_rate"] == 1.0
    assert result.metrics["no_mutation_without_confirmation_rate"] == 1.0
    assert result.metrics["fallback_rate"] <= 0.2


def test_phase3_dataset_locks_required_categories() -> None:
    categories = {case["category"] for case in load_cases()}

    assert {
        "product_search",
        "filter_by_price",
        "recommendation",
        "order_status",
        "cart_draft",
        "support_handoff",
        "policy_or_faq",
        "unsafe_malformed",
    } <= categories


def test_phase5_dataset_covers_all_knowledge_sources() -> None:
    source_ids = {
        case["expected"]["knowledgeSourceId"]
        for case in load_cases()
        if case["category"] == "policy_or_faq" and "knowledgeSourceId" in case["expected"]
    }

    assert source_ids == {
        "faq-account",
        "faq-order",
        "faq-product",
        "payment",
        "return-refund",
        "shipping",
        "size-guide",
    }


def test_evaluation_checks_expected_answer_content() -> None:
    result = evaluate_cases(
        [
            {
                "id": "answer_contains_negative_check",
                "category": "policy_or_faq",
                "message": "return policy",
                "expected": {
                    "intent": "policy_or_faq",
                    "responseType": "answer",
                    "requiredSlots": {},
                    "toolCalls": ["knowledge.retrieve"],
                    "requiresConfirmation": False,
                    "answerContains": "this phrase is not in the answer",
                },
            }
        ]
    )

    assert result.case_results[0]["checks"]["answer_contains"] is False
    assert result.case_results[0]["passed"] is False


def test_evaluation_checks_expected_knowledge_source_id() -> None:
    result = evaluate_cases(
        [
            {
                "id": "knowledge_source_negative_check",
                "category": "policy_or_faq",
                "message": "shipping fees standard domestic",
                "expected": {
                    "intent": "policy_or_faq",
                    "responseType": "answer",
                    "requiredSlots": {},
                    "toolCalls": ["knowledge.retrieve"],
                    "requiresConfirmation": False,
                    "knowledgeSourceId": "payment",
                },
            }
        ]
    )

    assert result.case_results[0]["checks"]["knowledge_source"] is False
    assert result.case_results[0]["passed"] is False


def test_evaluation_checks_expected_tool_call_sequence() -> None:
    result = evaluate_cases(
        [
            {
                "id": "tool_sequence_negative_check",
                "category": "recommendation",
                "setupMessages": ["ao khoac den size M"],
                "message": "goi y san pham tuong tu",
                "expected": {
                    "intent": "recommendation",
                    "responseType": "recommendations",
                    "requiredSlots": {},
                    "toolCalls": ["recommend.similar"],
                    "toolCallSequence": ["catalog.search", "recommend.similar"],
                    "requiresConfirmation": False,
                },
            }
        ]
    )

    assert result.case_results[0]["checks"]["tool_sequence"] is False
    assert result.case_results[0]["passed"] is False


def test_evaluation_covers_recommendation_empty_result_fallback(monkeypatch) -> None:
    class EmptyRecommendation:
        def similar(self, product_id=None, variant_id=None, recent_product_ids=None):
            return ToolResult(status="empty_result", data=[], summary="0 recommendations")

    monkeypatch.setattr(graph_nodes.tools, "recommendation", EmptyRecommendation())

    result = evaluate_cases(
        [
            {
                "id": "recommendation_empty_result_fallback",
                "category": "recommendation_fallback",
                "setupMessages": ["ao khoac den size M"],
                "message": "goi y san pham tuong tu",
                "expected": {
                    "intent": "recommendation",
                    "responseType": "recommendations",
                    "requiredSlots": {},
                    "toolCalls": ["recommend.similar", "recommend.by_text", "catalog.search"],
                    "toolCallSequence": ["recommend.similar", "recommend.by_text", "catalog.search"],
                    "fallbackCount": 1,
                    "requiresConfirmation": False,
                },
            }
        ]
    )

    assert result.case_results[0]["checks"]["fallback_count"] is True
    assert result.case_results[0]["passed"] is True


def test_evaluation_covers_recommendation_timeout_fallback(monkeypatch) -> None:
    class TimeoutRecommendation:
        def similar(self, product_id=None, variant_id=None, recent_product_ids=None):
            return ToolResult(status="timeout", data=[], summary="recommendation timeout")

    monkeypatch.setattr(graph_nodes.tools, "recommendation", TimeoutRecommendation())

    result = evaluate_cases(
        [
            {
                "id": "recommendation_timeout_fallback",
                "category": "recommendation_fallback",
                "setupMessages": ["ao khoac den size M"],
                "message": "goi y san pham tuong tu",
                "expected": {
                    "intent": "recommendation",
                    "responseType": "recommendations",
                    "requiredSlots": {},
                    "toolCalls": ["recommend.similar", "recommend.by_text", "catalog.search"],
                    "toolCallSequence": ["recommend.similar", "recommend.by_text", "catalog.search"],
                    "toolStatuses": {
                        "recommend.similar": "timeout",
                        "recommend.by_text": "backend_error",
                        "catalog.search": "success",
                    },
                    "fallbackCount": 1,
                    "requiresConfirmation": False,
                },
            }
        ]
    )

    assert result.case_results[0]["checks"]["tool_statuses"] is True
    assert result.case_results[0]["passed"] is True


def test_evaluation_covers_recommendation_validation_error_fallback(monkeypatch) -> None:
    class InvalidRecommendation:
        def similar(self, product_id=None, variant_id=None, recent_product_ids=None):
            return ToolResult(status="validation_error", data=[], summary="invalid recommendation payload")

    monkeypatch.setattr(graph_nodes.tools, "recommendation", InvalidRecommendation())

    result = evaluate_cases(
        [
            {
                "id": "recommendation_validation_error_fallback",
                "category": "recommendation_fallback",
                "setupMessages": ["ao khoac den size M"],
                "message": "goi y san pham tuong tu",
                "expected": {
                    "intent": "recommendation",
                    "responseType": "recommendations",
                    "requiredSlots": {},
                    "toolCalls": ["recommend.similar", "recommend.by_text", "catalog.search"],
                    "toolCallSequence": ["recommend.similar", "recommend.by_text", "catalog.search"],
                    "toolStatuses": {
                        "recommend.similar": "validation_error",
                        "recommend.by_text": "backend_error",
                        "catalog.search": "success",
                    },
                    "fallbackCount": 1,
                    "requiresConfirmation": False,
                },
            }
        ]
    )

    assert result.case_results[0]["checks"]["tool_statuses"] is True
    assert result.case_results[0]["passed"] is True

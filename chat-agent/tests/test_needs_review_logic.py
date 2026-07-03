from __future__ import annotations

from app.graph.nodes import _needs_review


def test_high_confidence_no_fallback_not_flagged():
    state = {"fallback_count": 0}
    assert _needs_review(state, 0.9, 0.9, "answer") is False


def test_single_fallback_with_high_confidence_not_flagged():
    """Recommender returning empty and falling back to catalog is expected
    behaviour and should not flood the review queue when the intent is clear."""
    state = {"fallback_count": 1}
    assert _needs_review(state, 0.9, 0.9, "recommendations") is False


def test_single_fallback_with_low_confidence_flagged():
    state = {"fallback_count": 1}
    assert _needs_review(state, 0.5, 0.9, "recommendations") is True


def test_multiple_fallback_always_flagged():
    state = {"fallback_count": 2}
    assert _needs_review(state, 0.95, 0.95, "answer") is True


def test_low_intent_confidence_flagged():
    state = {"fallback_count": 0}
    assert _needs_review(state, 0.4, 0.9, "answer") is True


def test_low_routing_confidence_flagged():
    state = {"fallback_count": 0}
    assert _needs_review(state, 0.9, 0.5, "answer") is True


def test_fallback_response_type_flagged():
    state = {"fallback_count": 0}
    assert _needs_review(state, 0.9, 0.9, "fallback") is True


def test_tool_error_response_type_flagged():
    state = {"fallback_count": 0}
    assert _needs_review(state, 0.9, 0.9, "tool_error") is True


def test_empty_result_response_type_flagged():
    state = {"fallback_count": 0}
    assert _needs_review(state, 0.9, 0.9, "empty_result") is True


def test_pre_set_needs_review_respected():
    state = {"needs_review": True, "fallback_count": 0}
    assert _needs_review(state, 0.95, 0.95, "answer") is True

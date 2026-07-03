from __future__ import annotations

from app.graph.nodes import ANSWER_MAX_CHARS, _sanitize_answer, output_guardrails


def test_clean_answer_unchanged():
    answer = "Return policy: 30 days. See https://shop.com/policy"
    cleaned, mods = _sanitize_answer(answer)
    assert cleaned == answer
    assert mods == []


def test_script_tag_stripped():
    answer = "Hello <script>alert(1)</script> world"
    cleaned, mods = _sanitize_answer(answer)
    assert "<script" not in cleaned
    assert "alert" not in cleaned
    assert "stripped_script_tags" in mods


def test_javascript_uri_replaced():
    answer = "Click [here](javascript:alert(1)) for details."
    cleaned, mods = _sanitize_answer(answer)
    assert "javascript:" not in cleaned
    assert "[link removed]" in cleaned
    assert "stripped_unsafe_url" in mods


def test_data_uri_replaced():
    answer = "Embedded image: data:text/html;base64,PHNjcmlwdD4="
    cleaned, mods = _sanitize_answer(answer)
    assert "data:" not in cleaned
    assert "stripped_unsafe_url" in mods


def test_safe_url_preserved():
    answer = "Visit https://example.com or http://shop.com or mailto:hi@a.com"
    cleaned, mods = _sanitize_answer(answer)
    assert "https://example.com" in cleaned
    assert "http://shop.com" in cleaned
    assert "mailto:hi@a.com" in cleaned
    assert mods == []


def test_long_answer_truncated_with_ellipsis():
    answer = "a" * (ANSWER_MAX_CHARS + 500)
    cleaned, mods = _sanitize_answer(answer)
    assert len(cleaned) <= ANSWER_MAX_CHARS
    assert cleaned.endswith("...")
    assert "truncated_to_max_chars" in mods


def test_output_guardrails_applies_sanitization_to_state():
    state = {
        "answer": "Hi <script>bad</script> bye",
        "draft_action": None,
        "node_trace": [],
    }
    result = output_guardrails(state)
    assert "<script" not in result["answer"]
    assert "Hi" in result["answer"]
    assert "bye" in result["answer"]

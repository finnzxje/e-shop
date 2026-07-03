from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import httpx

from app.services.circuit_breaker import openai_breaker


LLM_SYSTEM_PROMPT = """You are an e-commerce assistant for an outdoor apparel shop.
Answer only from the provided tool data and retrieved knowledge.
Do not invent prices, stock, policies, order status, or discounts.
Do not claim that a cart/support/order mutation was completed unless the response is an action_result.
Keep the answer concise and helpful. Use the customer's language when it is clear.
If the products returned do not match the specific item the customer asked for
(e.g. they asked for a "hoodie" and the results are sweatshirts and pullovers),
say so explicitly: acknowledge that the exact item is not available and offer
the closest related options instead. Never present unrelated categories
(e.g. pants) as if they matched the request."""


@dataclass(frozen=True)
class LlmResult:
    answer: str
    used: bool
    error: str | None = None


def llm_enabled() -> bool:
    return _env_bool("LLM_ENABLED", False) and bool(_api_key())


def generate_grounded_answer(
    *,
    message: str,
    intent: str,
    response_type: str,
    current_answer: str,
    product_cards: list[Any] | None = None,
    grounding_documents: list[dict[str, Any]] | None = None,
    order: dict[str, Any] | None = None,
    tool_summaries: list[str] | None = None,
) -> LlmResult:
    if not llm_enabled():
        return LlmResult(answer=current_answer, used=False)

    if openai_breaker.is_open():
        return LlmResult(answer=current_answer, used=False, error="openai_circuit_open")

    payload = {
        "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
        "temperature": float(os.getenv("LLM_TEMPERATURE", "0.2")),
        "max_tokens": int(os.getenv("LLM_MAX_TOKENS", "220")),
        "messages": [
            {"role": "system", "content": LLM_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _prompt(
                    message=message,
                    intent=intent,
                    response_type=response_type,
                    current_answer=current_answer,
                    product_cards=product_cards or [],
                    grounding_documents=grounding_documents or [],
                    order=order,
                    tool_summaries=tool_summaries or [],
                ),
            },
        ],
    }
    try:
        with httpx.Client(timeout=float(os.getenv("LLM_TIMEOUT_SECONDS", "8"))) as client:
            response = client.post(_api_url(), headers=_headers(), json=payload)
            response.raise_for_status()
            body = response.json()
        answer = _extract_answer(body).strip()
        openai_breaker.record_success()
        if not answer:
            return LlmResult(answer=current_answer, used=False, error="empty llm answer")
        return LlmResult(answer=answer, used=True)
    except Exception as exc:  # pragma: no cover - network/provider defensive path
        openai_breaker.record_failure()
        return LlmResult(answer=current_answer, used=False, error=f"{exc.__class__.__name__}: {exc}")


def _prompt(
    *,
    message: str,
    intent: str,
    response_type: str,
    current_answer: str,
    product_cards: list[Any],
    grounding_documents: list[dict[str, Any]],
    order: dict[str, Any] | None,
    tool_summaries: list[str],
) -> str:
    return "\n\n".join(
        [
            f"Customer message:\n{message}",
            f"Intent: {intent}",
            f"Response type: {response_type}",
            f"Fallback/template answer:\n{current_answer}",
            f"Products:\n{_compact_products(product_cards)}",
            f"Knowledge documents:\n{_compact_documents(grounding_documents)}",
            f"Order:\n{_compact_order(order)}",
            f"Tool summaries:\n{chr(10).join(tool_summaries) if tool_summaries else 'none'}",
            "Write ONE customer-facing answer that synthesizes ALL provided knowledge documents when more than one is relevant. "
            "Do NOT copy a markdown section verbatim. Keep the answer to 2-4 sentences. "
            "If documents are provided, cite source ids in parentheses like (source: shipping). "
            "If products are provided, mention at most three product names.",
        ]
    )


def _compact_products(cards: list[Any]) -> str:
    rows: list[str] = []
    for index, card in enumerate(cards[:4], start=1):
        get = card.get if isinstance(card, dict) else lambda key, default=None: getattr(card, key, default)
        rows.append(
            f"{index}. {get('name')} | price={get('price')} {get('currency', '')} | "
            f"inStock={get('inStock', get('in_stock', None))} | reason={get('recommendationReason', get('recommendation_reason', None))}"
        )
    return "\n".join(rows) if rows else "none"


def _compact_documents(documents: list[dict[str, Any]]) -> str:
    rows = []
    for doc in documents[:3]:
        body = " ".join(str(doc.get("body", "")).split())[:900]
        rows.append(f"- sourceId={doc.get('sourceId')} title={doc.get('title')} score={doc.get('score')}: {body}")
    return "\n".join(rows) if rows else "none"


def _compact_order(order: dict[str, Any] | None) -> str:
    if not order:
        return "none"
    keys = ("orderNumber", "orderId", "status", "paymentStatus", "eta", "total")
    return ", ".join(f"{key}={order.get(key)}" for key in keys if order.get(key) is not None)


def _extract_answer(body: dict[str, Any]) -> str:
    choices = body.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, dict) and isinstance(message.get("content"), str):
                return message["content"]
            if isinstance(first.get("text"), str):
                return first["text"]
    if isinstance(body.get("output_text"), str):
        return body["output_text"]
    return ""


def _api_url() -> str:
    return os.getenv("LLM_API_URL", "https://api.openai.com/v1/chat/completions")


def _api_key() -> str | None:
    return os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"}


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes"}

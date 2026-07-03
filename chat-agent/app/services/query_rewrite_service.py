from __future__ import annotations

import os
from typing import Any

import httpx

from app.services.circuit_breaker import openai_breaker
from app.services.llm_service import llm_enabled


SYSTEM_PROMPT = (
    "You rewrite the customer's latest message into a standalone search query that "
    "captures any context from the previous assistant response. Return only the rewritten "
    "query as a single line of plain text with no commentary, no quotes, and no prefix."
)

ALLOWED_INTENTS = {"policy_or_faq", "product_search", "recommendation", "order_status"}


def rewrite_query_with_history(
    *,
    message: str,
    last_assistant: str | None,
    last_intent: str | None,
) -> str:
    if not llm_enabled():
        return message
    if not last_assistant or not last_intent:
        return message
    if last_intent not in ALLOWED_INTENTS:
        return message
    if openai_breaker.is_open():
        return message
    payload: dict[str, Any] = {
        "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
        "temperature": 0.0,
        "max_tokens": 80,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Previous assistant turn (intent={last_intent}):\n{last_assistant}\n\n"
                    f"Customer's new message:\n{message}\n\n"
                    "Rewritten standalone query:"
                ),
            },
        ],
    }
    try:
        with httpx.Client(timeout=float(os.getenv("LLM_TIMEOUT_SECONDS", "8"))) as client:
            response = client.post(_api_url(), headers=_headers(), json=payload)
            response.raise_for_status()
            body = response.json()
        rewritten = _extract_answer(body).strip()
        openai_breaker.record_success()
        if not rewritten:
            return message
        return rewritten
    except Exception:  # pragma: no cover - defensive
        openai_breaker.record_failure()
        return message


def _extract_answer(body: dict[str, Any]) -> str:
    choices = body.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message")
            if isinstance(message, dict) and isinstance(message.get("content"), str):
                return message["content"]
    return ""


def _api_url() -> str:
    return os.getenv("LLM_API_URL", "https://api.openai.com/v1/chat/completions")


def _api_key() -> str | None:
    return os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"}

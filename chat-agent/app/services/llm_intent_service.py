from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

import httpx

from app.schemas import Intent
from app.services.llm_service import llm_enabled


_LLM_INTENT_CACHE_SIZE = int(os.getenv("LLM_INTENT_CACHE_SIZE", "1024"))


VALID_INTENTS: tuple[Intent, ...] = (
    "product_search",
    "recommendation",
    "cart_action",
    "order_status",
    "support_handoff",
    "policy_or_faq",
    "general",
    "fallback",
)


SYSTEM_PROMPT = """You classify customer messages for an e-commerce chatbot.

Be tolerant of typos, slang, abbreviations, stretched letters ("helllpp", "managerrrr"),
mixed languages, and shorthand from non-native English speakers. Read the customer's
intent through the noise.

Reply with EXACTLY one of these intent names — no explanation, no punctuation, no quotes:

- product_search: user describes / searches for a specific product. Examples: "red shirt", "ao mau xanh", "any nice jacket", "size M pants for men"
- recommendation: user asks for suggestions / similar items. Examples: "what should I buy", "recommend something", "any nice ones"
- cart_action: user wants to add / remove / update cart. Examples: "add to cart", "remove that", "cart"
- order_status: user asks about order / tracking / shipment / delivery. Examples: "where is my order", "ORD-12345", "tracking", "trackk plz"
- support_handoff: user wants a human OR shows frustration / files a complaint. Examples: "manager", "managerrrr", "speak to human", "this is unacceptable", "complaint", "I want to talk to someone", "agent please", "help me real person"
- policy_or_faq: user asks about policies. Examples: "return policy", "refund", "shipping cost", "size guide", "how to login", "wash care", "waterproof"
- general: greeting, unclear, off-topic. Examples: "hi", "thanks", "ok", random characters

When in doubt between general and support_handoff for short angry-looking messages
("manage", "agent", "humann"), choose support_handoff.

Reply with ONLY the intent name. One word."""


_REPEATED_CHAR_RE = None  # lazy compile in _normalize_for_llm


def _normalize_for_llm(message: str) -> str:
    """Squash stretched chars so the LLM sees clearer text.
    "managerrrrr" -> "managerr", "helllllllp" -> "hellp" (kept >= 2 to preserve
    real double-letter words like "hello", "letter").
    """
    import re

    global _REPEATED_CHAR_RE
    if _REPEATED_CHAR_RE is None:
        _REPEATED_CHAR_RE = re.compile(r"(.)\1{2,}")
    return _REPEATED_CHAR_RE.sub(r"\1\1", message.strip())


def classify_intent_with_llm(message: str) -> Intent | None:
    """Return classified intent or None on failure / LLM disabled."""
    if not llm_enabled() or not message.strip():
        return None
    cleaned = _normalize_for_llm(message)
    return _classify_cached(cleaned)


@lru_cache(maxsize=_LLM_INTENT_CACHE_SIZE)
def _classify_cached(cleaned_message: str) -> Intent | None:
    from app.services.circuit_breaker import openai_breaker

    if openai_breaker.is_open():
        return None
    payload: dict[str, Any] = {
        "model": os.getenv("LLM_INTENT_MODEL", os.getenv("LLM_MODEL", "gpt-4o-mini")),
        "temperature": 0.0,
        "max_tokens": 12,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": cleaned_message},
        ],
    }
    try:
        with httpx.Client(timeout=float(os.getenv("LLM_TIMEOUT_SECONDS", "8"))) as client:
            response = client.post(_api_url(), headers=_headers(), json=payload)
            response.raise_for_status()
            verdict = _extract_answer(response.json()).strip().lower()
        openai_breaker.record_success()
    except Exception:  # pragma: no cover - defensive
        openai_breaker.record_failure()
        return None
    candidate = verdict.split()[0] if verdict else ""
    candidate = candidate.strip(".,:;\"'`")
    if candidate in VALID_INTENTS:
        return candidate  # type: ignore[return-value]
    return None


def clear_intent_cache() -> None:
    """Clear the LLM intent cache. Useful for tests."""
    _classify_cached.cache_clear()


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

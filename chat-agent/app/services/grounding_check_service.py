from __future__ import annotations

import os
from typing import Any

import httpx

from app.services.circuit_breaker import openai_breaker
from app.services.llm_service import llm_enabled
from app.services.logging_service import log_event


SYSTEM_PROMPT = (
    "You are a fact-check judge. Decide whether the assistant's answer is supported by the "
    "provided knowledge documents. Reply with one line. If every claim in the answer is "
    "supported, reply exactly: GROUNDED. Otherwise reply: UNGROUNDED: <short reason naming "
    "the unsupported claim>. Do not add anything else."
)


def is_answer_grounded(
    *,
    answer: str,
    grounding_documents: list[dict[str, Any]],
) -> tuple[bool, str | None]:
    if not llm_enabled():
        return True, None
    if not answer.strip() or not grounding_documents:
        return True, None
    documents_text = "\n\n".join(
        f"[{doc.get('sourceId', 'unknown')}] {str(doc.get('body', ''))[:1200]}"
        for doc in grounding_documents[:3]
    )
    payload: dict[str, Any] = {
        "model": os.getenv("LLM_MODEL", "gpt-4o-mini"),
        "temperature": 0.0,
        "max_tokens": 80,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Knowledge documents:\n{documents_text}\n\n"
                    f"Assistant answer:\n{answer}\n\n"
                    "Verdict:"
                ),
            },
        ],
    }
    if openai_breaker.is_open():
        log_event("grounding_check_skipped", reason="openai_circuit_open")
        return False, "grounding_check_unavailable"
    try:
        with httpx.Client(timeout=float(os.getenv("LLM_TIMEOUT_SECONDS", "8"))) as client:
            response = client.post(_api_url(), headers=_headers(), json=payload)
            response.raise_for_status()
            verdict = _extract_answer(response.json()).strip()
        openai_breaker.record_success()
    except Exception as exc:
        openai_breaker.record_failure()
        log_event("grounding_check_failed", error=f"{exc.__class__.__name__}: {exc}")
        return False, "grounding_check_unavailable"
    if verdict.upper().startswith("GROUNDED"):
        return True, None
    if verdict.upper().startswith("UNGROUNDED"):
        reason = verdict.split(":", 1)[1].strip() if ":" in verdict else verdict
        return False, reason or "unsupported claim"
    return True, None


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

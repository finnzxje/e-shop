from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response

from app.graph import run_agent
from app.schemas import AgentChatRequest, AgentChatResponse
from app.services import memory_service, response_cache
from app.services.env_service import load_local_env
from app.services.logging_service import configure_logging, log_event
from app.services.metrics_service import metrics_service
from app.services.rate_limit_service import rate_limiter
from app.services.trace_context_service import reset_auth_token, set_auth_token


load_local_env()
configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log_event("chat_agent_startup", version="0.1.0")
    yield
    log_event(
        "chat_agent_shutdown",
        response_cache_size=response_cache.size(),
        session_memory_size=memory_service.size(),
    )


app = FastAPI(title="E-Shop AI Chat Agent", version="0.1.0", lifespan=lifespan)


@app.get("/agent/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "chat-agent"}


@app.get("/agent/metrics")
def metrics() -> Response:
    return Response(content=metrics_service.render_prometheus(), media_type="text/plain; version=0.0.4")


def _extract_bearer_token(header_value: str | None) -> str | None:
    if not header_value or not header_value.lower().startswith("bearer "):
        return None
    return header_value.split(" ", 1)[1].strip() or None


def chat(request: AgentChatRequest) -> AgentChatResponse:
    return run_agent(request)


EMPTY_INPUT_REPLY = (
    "Please type something — I can help with products, orders, returns, or policies."
)

RATE_LIMITED_REPLY = (
    "You're sending messages a bit too quickly. Please wait a moment and try again."
)


def _empty_input_response(request: AgentChatRequest) -> AgentChatResponse:
    return AgentChatResponse(
        sessionId=request.session_id,
        traceId=request.trace_id or "",
        intent="general",
        responseType="answer",
        answer=EMPTY_INPUT_REPLY,
    )


def _rate_limited_response(request: AgentChatRequest) -> AgentChatResponse:
    return AgentChatResponse(
        sessionId=request.session_id,
        traceId=request.trace_id or "",
        intent="general",
        responseType="answer",
        answer=RATE_LIMITED_REPLY,
    )


def _client_key(http_request: Request) -> str:
    forwarded = http_request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()
    if http_request.client and http_request.client.host:
        return http_request.client.host
    return ""


@app.post("/agent/chat", response_model=AgentChatResponse, response_model_by_alias=True)
def chat_endpoint(request: AgentChatRequest, http_request: Request) -> AgentChatResponse:
    request.trace_id = request.trace_id or http_request.headers.get("x-trace-id")
    request.request_id = request.request_id or http_request.headers.get("x-request-id")
    request.traceparent = request.traceparent or http_request.headers.get("traceparent")
    request.session_id = request.session_id or http_request.headers.get("x-session-id") or request.session_id

    client_key = _client_key(http_request)
    allowed, retry_after = rate_limiter.consume(client_key)
    if not allowed:
        log_event("rate_limited", clientKey=client_key, retryAfterSeconds=round(retry_after, 1))
        return _rate_limited_response(request)

    if not request.message.strip():
        log_event("empty_input_rejected", sessionId=request.session_id)
        return _empty_input_response(request)

    # Serve from response cache for stable FAQ/general/handoff queries — same
    # message returns the same answer, so we skip the whole graph (retrieval +
    # LLM synthesis + LLM grounding) and answer in <10ms.
    cached_payload = response_cache.get(request.message, request.authenticated)
    if cached_payload is not None:
        cached_response = AgentChatResponse.model_validate(cached_payload)
        # Rebind per-request identifiers so the cached body looks fresh.
        cached_response.session_id = request.session_id
        if request.trace_id:
            cached_response.trace_id = request.trace_id
        log_event(
            "response_cache_hit",
            sessionId=request.session_id,
            intent=cached_response.intent,
        )
        return cached_response

    token_value = _extract_bearer_token(http_request.headers.get("Authorization"))
    auth_handle = set_auth_token(token_value)
    try:
        result = run_agent(request)
    finally:
        reset_auth_token(auth_handle)

    # Only cache "clean" answers — skip when needs_review (grounding flagged
    # or LLM failed) so we don't keep serving a flawed reply.
    if not result.needs_review:
        response_cache.put(
            message=request.message,
            intent=result.intent,
            response=result.model_dump(by_alias=False),
            authenticated=request.authenticated,
        )
    return result

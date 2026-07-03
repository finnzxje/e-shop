from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


Intent = Literal[
    "product_search",
    "recommendation",
    "cart_action",
    "order_status",
    "support_handoff",
    "policy_or_faq",
    "general",
    "fallback",
]

ResponseType = Literal[
    "clarification",
    "product_results",
    "recommendations",
    "order_status",
    "draft_action",
    "action_result",
    "handoff",
    "fallback",
    "empty_result",
    "tool_error",
    "auth_required",
    "answer",
]
ToolStatus = Literal["success", "empty_result", "timeout", "unauthorized", "backend_error", "validation_error", "skipped"]
DraftStatus = Literal["pending", "completed", "cancelled", "expired", "failed"]
DraftActionType = Literal[
    "cart.add",
    "cart.update_quantity",
    "cart.remove_item",
    "support.handoff",
]


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ProductCard(CamelModel):
    product_id: str = Field(alias="productId")
    variant_id: str | None = Field(default=None, alias="variantId")
    name: str
    slug: str
    category: str
    gender: str
    price: int
    currency: str = "VND"
    image_url: str | None = Field(default=None, alias="imageUrl")
    colors: list[str] = Field(default_factory=list)
    sizes: list[str] = Field(default_factory=list)
    in_stock: bool = Field(alias="inStock")
    stock: int = 0
    reason: str | None = None
    recommendation_rank: int | None = Field(default=None, alias="recommendationRank")
    recommendation_score: float | None = Field(default=None, alias="recommendationScore")
    recommendation_reason: str | None = Field(default=None, alias="recommendationReason")


class DraftAction(CamelModel):
    draft_action_id: str = Field(alias="draftActionId")
    action_type: DraftActionType = Field(alias="actionType")
    payload: dict[str, Any] = Field(default_factory=dict)
    status: DraftStatus = "pending"
    expires_at: datetime = Field(alias="expiresAt")
    needs_confirmation: bool = Field(default=True, alias="needsConfirmation")


class NodeTrace(CamelModel):
    node_name: str = Field(alias="nodeName")
    status: Literal["success", "error", "skipped"]
    latency_ms: float = Field(alias="latencyMs")
    intent: Intent = "general"
    input_summary: str = Field(default="", alias="inputSummary")
    output_summary: str = Field(default="", alias="outputSummary")
    intent_confidence: float | None = Field(default=None, alias="intentConfidence")
    routing_confidence: float | None = Field(default=None, alias="routingConfidence")
    error_class: str | None = Field(default=None, alias="errorClass")
    error_message: str | None = Field(default=None, alias="errorMessage")


class ToolCallTrace(CamelModel):
    tool_name: str = Field(alias="toolName")
    status: ToolStatus
    latency_ms: float = Field(alias="latencyMs")
    trace_id: str | None = Field(default=None, alias="traceId")
    input: dict[str, Any] = Field(default_factory=dict)
    request_summary: str = Field(default="", alias="requestSummary")
    response_summary: str = Field(default="", alias="responseSummary")
    output_summary: str = Field(default="", alias="outputSummary")
    error: str | None = None
    error_class: str | None = Field(default=None, alias="errorClass")
    error_message: str | None = Field(default=None, alias="errorMessage")


class Citation(CamelModel):
    source_id: str = Field(alias="sourceId")
    source_type: str = Field(alias="sourceType")
    title: str
    snippet: str
    score: float | None = None


class AgentChatRequest(CamelModel):
    message: str = Field(default="")
    session_id: str = Field(default="demo", min_length=1, alias="sessionId")
    trace_id: str | None = Field(default=None, alias="traceId")
    request_id: str | None = Field(default=None, alias="requestId")
    traceparent: str | None = None
    user_id: str | None = Field(default=None, alias="userId")
    authenticated: bool = False
    page_context: dict[str, Any] = Field(default_factory=dict, alias="pageContext")

    @field_validator("session_id")
    @classmethod
    def reject_blank_session_id(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped


class AgentChatResponse(CamelModel):
    session_id: str = Field(alias="sessionId")
    trace_id: str = Field(alias="traceId")
    intent: Intent
    response_type: ResponseType = Field(alias="responseType")
    answer: str
    product_cards: list[ProductCard] = Field(default_factory=list, alias="productCards")
    draft_action: DraftAction | None = Field(default=None, alias="draftAction")
    needs_confirmation: bool = Field(default=False, alias="needsConfirmation")
    tool_calls: list[ToolCallTrace] = Field(default_factory=list, alias="toolCalls")
    node_traces: list[NodeTrace] = Field(default_factory=list, alias="nodeTraces")
    slots: dict[str, Any] = Field(default_factory=dict)
    citations: list[Citation] = Field(default_factory=list)
    intent_confidence: float = Field(default=0, alias="intentConfidence")
    routing_confidence: float = Field(default=0, alias="routingConfidence")
    needs_review: bool = Field(default=False, alias="needsReview")
    latency_ms: float = Field(default=0, alias="latencyMs")
    fallback_count: int = Field(default=0, alias="fallbackCount")


class AgentState(CamelModel):
    session_id: str = Field(alias="sessionId")
    trace_id: str = Field(alias="traceId")
    user_id: str | None = Field(default=None, alias="userId")
    authenticated: bool = False
    message: str
    normalized_message: str = Field(default="", alias="normalizedMessage")
    page_context: dict[str, Any] = Field(default_factory=dict, alias="pageContext")
    intent: Intent = "general"
    slots: dict[str, Any] = Field(default_factory=dict)
    intent_confidence: float = Field(default=0, alias="intentConfidence")
    routing_confidence: float = Field(default=0, alias="routingConfidence")
    needs_review: bool = Field(default=False, alias="needsReview")
    route: str = "tool"
    answer: str = ""
    response_type: ResponseType = Field(default="answer", alias="responseType")
    product_cards: list[ProductCard] = Field(default_factory=list, alias="productCards")
    draft_action: DraftAction | None = Field(default=None, alias="draftAction")
    needs_confirmation: bool = Field(default=False, alias="needsConfirmation")
    tool_calls: list[ToolCallTrace] = Field(default_factory=list, alias="toolCalls")
    node_trace: list[NodeTrace] = Field(default_factory=list, alias="nodeTrace")
    citations: list[Citation] = Field(default_factory=list)
    last_selected_product: ProductCard | None = Field(default=None, alias="lastSelectedProduct")
    last_selected_order: dict[str, Any] | None = Field(default=None, alias="lastSelectedOrder")
    latency_ms: float = Field(default=0, alias="latencyMs")
    fallback_count: int = Field(default=0, alias="fallbackCount")

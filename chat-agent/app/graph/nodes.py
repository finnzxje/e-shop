from __future__ import annotations

import re
from collections import Counter
from typing import Any

from app.graph.state import GraphState
from app.schemas import DraftAction, ProductCard
from app.services import grounding_check_service
from app.services import memory_service
from app.services import query_rewrite_service
from app.services.llm_intent_service import classify_intent_with_llm
from app.services.llm_service import generate_grounded_answer
from app.services.logging_service import log_event
from app.services.trace_service import call_tool
from app.tools import ToolRegistry
from app.tools.base import ToolResult
from app.utils import classify_intent as classify_intent_rule
from app.utils import extract_slots as extract_slots_rule
from app.utils import normalize_text


tools = ToolRegistry()


CONFIDENCE_CERTAIN = 1.0
CONFIDENCE_HIGH = 0.9
CONFIDENCE_MEDIUM = 0.8
CONFIDENCE_LOW = 0.55
REVIEW_CONFIDENCE_THRESHOLD = 0.7

AUTH_REQUIRED_ROUTE_CONFIDENCE = CONFIDENCE_CERTAIN
MISSING_ORDER_SLOT_ROUTE_CONFIDENCE = CONFIDENCE_MEDIUM
MISSING_CART_PRODUCT_ROUTE_CONFIDENCE = CONFIDENCE_MEDIUM
GENERAL_ROUTE_CONFIDENCE = CONFIDENCE_LOW
PRODUCT_FILTER_INTENT_CONFIDENCE = CONFIDENCE_HIGH
PRODUCT_QUERY_INTENT_CONFIDENCE = CONFIDENCE_MEDIUM
SPECIALIZED_INTENT_CONFIDENCE = CONFIDENCE_HIGH
RECOMMENDATION_OR_POLICY_INTENT_CONFIDENCE = CONFIDENCE_MEDIUM
DEFAULT_ROUTE_CONFIDENCE = CONFIDENCE_MEDIUM

# Cost-saving thresholds: when the cheap classifier/retrieval is already this
# confident, skip the expensive LLM follow-up call.
SKIP_LLM_INTENT_RULE_CONFIDENCE = CONFIDENCE_MEDIUM
SKIP_LLM_GROUNDING_SCORE = CONFIDENCE_HIGH


def append_node(state: GraphState, node: str):
    return [*state.get("node_trace", [])]


def load_session_context(state: GraphState) -> dict[str, Any]:
    memory = memory_service.get(state["session_id"])
    return {
        "previous_products": memory.previous_products,
        "previous_tool_results": memory.previous_tool_results,
        "last_intent": memory.last_intent,
        "last_assistant_response": memory.last_assistant_response,
        "last_selected_product": memory.last_selected_product,
        "last_selected_order": memory.last_selected_order,
        "node_trace": append_node(state, "load_session_context"),
    }


def normalize_message(state: GraphState) -> dict[str, Any]:
    return {
        "normalized_message": normalize_text(state["message"]),
        "node_trace": append_node(state, "normalize_message"),
    }


_INJECTION_PATTERNS = (
    re.compile(r"\b(ignore|disregard|forget|override)\s+(\w+\s+){0,3}(instructions?|prompts?|rules?|directions?)\b", re.IGNORECASE),
    re.compile(r"\b(reveal|show|tell|print|expose)\s+(\w+\s+){0,3}(system|hidden|internal)\s+(prompt|instructions?|message)\b", re.IGNORECASE),
    re.compile(r"\bbypass\s+(the\s+)?(safety|guardrails?|rules?|filter|restrictions?)\b", re.IGNORECASE),
    re.compile(r"\byou\s+are\s+now\s+(a|an|in)\b", re.IGNORECASE),
    re.compile(r"\bact\s+(as|like)\s+(if\s+you\s+(are|were)\s+)?(a|an)\s+\w+", re.IGNORECASE),
    re.compile(r"\b(jailbreak|DAN\s+mode|developer\s+mode)\b", re.IGNORECASE),
    re.compile(r"<\|.+?\|>"),
)


def _looks_like_prompt_injection(message: str) -> bool:
    return any(pattern.search(message) for pattern in _INJECTION_PATTERNS)


def input_guardrails(state: GraphState) -> dict[str, Any]:
    message = state.get("normalized_message", "")
    if not message:
        return {
            "intent": "fallback",
            "intent_confidence": CONFIDENCE_CERTAIN,
            "route": "clarification",
            "routing_confidence": CONFIDENCE_CERTAIN,
            "needs_review": True,
            "answer": "Please send a message so I can help.",
            "response_type": "clarification",
            "fallback_count": state.get("fallback_count", 0) + 1,
            "node_trace": append_node(state, "input_guardrails"),
        }
    if len(message) > 1000:
        return {
            "intent": "fallback",
            "intent_confidence": CONFIDENCE_CERTAIN,
            "route": "clarification",
            "routing_confidence": CONFIDENCE_CERTAIN,
            "needs_review": True,
            "answer": "Please shorten the message and try again.",
            "response_type": "clarification",
            "fallback_count": state.get("fallback_count", 0) + 1,
            "node_trace": append_node(state, "input_guardrails"),
        }
    if _looks_like_prompt_injection(state.get("message", "")):
        log_event(
            "prompt_injection_blocked",
            sessionId=state.get("session_id"),
            traceId=state.get("trace_id"),
        )
        return {
            "intent": "fallback",
            "intent_confidence": CONFIDENCE_CERTAIN,
            "route": "clarification",
            "routing_confidence": CONFIDENCE_CERTAIN,
            "needs_review": True,
            "answer": "I can help with shopping — products, orders, returns, or policies. How can I help?",
            "response_type": "clarification",
            "fallback_count": state.get("fallback_count", 0) + 1,
            "node_trace": append_node(state, "input_guardrails"),
        }
    return {"node_trace": append_node(state, "input_guardrails")}


def classify_intent(state: GraphState) -> dict[str, Any]:
    if state.get("intent") == "fallback":
        return {
            "intent_confidence": state.get("intent_confidence", CONFIDENCE_CERTAIN),
            "node_trace": append_node(state, "classify_intent"),
        }
    normalized = state.get("normalized_message", "")
    original = state.get("message", "")
    # Try the keyword rule first — instant and free. When the rule already
    # classifies the message with high confidence (clear keyword match), skip
    # the LLM call to save cost. Only fall back to LLM for ambiguous/general
    # messages where paraphrasing or typos might confuse the rule.
    rule_intent = classify_intent_rule(normalized)
    rule_confidence = _intent_confidence(rule_intent, normalized)
    if rule_intent != "general" and rule_confidence >= SKIP_LLM_INTENT_RULE_CONFIDENCE:
        return {
            "intent": rule_intent,
            "intent_confidence": rule_confidence,
            "node_trace": append_node(state, f"classify_intent:{rule_intent}:rule"),
        }
    llm_intent = classify_intent_with_llm(original or normalized)
    if llm_intent is not None:
        return {
            "intent": llm_intent,
            "intent_confidence": CONFIDENCE_HIGH,
            "node_trace": append_node(state, f"classify_intent:{llm_intent}:llm"),
        }
    return {
        "intent": rule_intent,
        "intent_confidence": rule_confidence,
        "node_trace": append_node(state, f"classify_intent:{rule_intent}"),
    }


def extract_slots(state: GraphState) -> dict[str, Any]:
    slots = extract_slots_rule(state.get("normalized_message", ""), state["message"])
    slots = _resolve_contextual_product(state, slots)
    return {"slots": slots, "node_trace": append_node(state, "extract_slots")}


def route_intent(state: GraphState) -> dict[str, Any]:
    if state.get("route") == "clarification":
        return {"node_trace": append_node(state, "route_intent")}

    intent = state.get("intent", "general")
    slots = state.get("slots", {})
    route = "tool"
    answer = state.get("answer", "")
    response_type = state.get("response_type", "answer")
    routing_confidence = _route_confidence(intent, slots, route)

    if intent == "order_status" and not state.get("authenticated"):
        route = "clarification"
        routing_confidence = AUTH_REQUIRED_ROUTE_CONFIDENCE
        response_type = "auth_required"
        answer = "Please sign in before I check order information."
    elif intent == "order_status" and not slots.get("order_id"):
        route = "clarification"
        routing_confidence = MISSING_ORDER_SLOT_ROUTE_CONFIDENCE
        response_type = "clarification"
        answer = "Please send an order number like ES123 so I can check the status."
    elif intent == "cart_action" and not _has_product_reference(slots):
        route = "clarification"
        routing_confidence = MISSING_CART_PRODUCT_ROUTE_CONFIDENCE
        response_type = "clarification"
        answer = "Please tell me which product you want to update in the cart."
    elif intent == "general":
        routing_confidence = GENERAL_ROUTE_CONFIDENCE

    return {
        "route": route,
        "routing_confidence": routing_confidence,
        "answer": answer,
        "response_type": response_type,
        "node_trace": append_node(state, "route_intent"),
    }


def build_clarification_response(state: GraphState) -> dict[str, Any]:
    answer = state.get("answer") or "I need a little more detail before I can help."
    return {
        "answer": answer,
        "response_type": state.get("response_type", "clarification"),
        "node_trace": append_node(state, "build_clarification_response"),
    }


def rewrite_query_for_retrieval(state: GraphState) -> dict[str, Any]:
    if state.get("intent") != "policy_or_faq":
        return {"node_trace": append_node(state, "rewrite_query_for_retrieval")}
    memory = memory_service.get(state.get("session_id", ""))
    rewritten = query_rewrite_service.rewrite_query_with_history(
        message=state.get("message", ""),
        last_assistant=memory.last_assistant_response,
        last_intent=memory.last_intent,
    )
    updates: dict[str, Any] = {"node_trace": append_node(state, "rewrite_query_for_retrieval")}
    if rewritten and rewritten != state.get("message", ""):
        updates["rewritten_query"] = rewritten
    return updates


def ground_response_in_tool_results(state: GraphState) -> dict[str, Any]:
    intent = state.get("intent", "general")

    if intent == "product_search":
        return _handle_product_search(state)
    if intent == "recommendation":
        return _handle_recommendation(state)
    if intent == "cart_action":
        return _handle_cart_action(state)
    if intent == "order_status":
        return _handle_order_status(state)
    if intent == "support_handoff":
        return _handle_support_handoff(state)
    if intent == "policy_or_faq":
        return _handle_policy_or_faq(state)

    return {
        "answer": "I can search products, recommend items, prepare cart actions, check orders, or hand off to support.",
        "response_type": "answer",
        "node_trace": append_node(state, "ground_response_in_tool_results"),
    }


ANSWER_MAX_CHARS = 2000
_UNSAFE_URL_RE = re.compile(r"(?:javascript|data|vbscript):[^\s)\"'<>]*", re.IGNORECASE)
_SCRIPT_TAG_RE = re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL)


def _sanitize_answer(answer: str) -> tuple[str, list[str]]:
    if not answer:
        return answer, []
    modifications: list[str] = []
    cleaned = answer
    if _SCRIPT_TAG_RE.search(cleaned):
        cleaned = _SCRIPT_TAG_RE.sub("", cleaned)
        modifications.append("stripped_script_tags")
    if _UNSAFE_URL_RE.search(cleaned):
        cleaned = _UNSAFE_URL_RE.sub("[link removed]", cleaned)
        modifications.append("stripped_unsafe_url")
    if len(cleaned) > ANSWER_MAX_CHARS:
        cleaned = cleaned[: ANSWER_MAX_CHARS - 3].rstrip() + "..."
        modifications.append("truncated_to_max_chars")
    return cleaned, modifications


def output_guardrails(state: GraphState) -> dict[str, Any]:
    draft_action = state.get("draft_action")
    needs_confirmation = bool(draft_action)
    if draft_action:
        draft_action = draft_action.model_copy(update={"needs_confirmation": True})
    answer = state.get("answer", "")
    cleaned_answer, modifications = _sanitize_answer(answer)
    if modifications:
        log_event(
            "output_sanitized",
            sessionId=state.get("session_id"),
            traceId=state.get("trace_id"),
            modifications=modifications,
            originalLength=len(answer),
            cleanedLength=len(cleaned_answer),
        )
    return {
        "answer": cleaned_answer,
        "draft_action": draft_action,
        "needs_confirmation": needs_confirmation,
        "node_trace": append_node(state, "output_guardrails"),
    }


def refine_grounded_answer_with_llm(state: GraphState) -> dict[str, Any]:
    response_type = state.get("response_type", "answer")
    if response_type not in {"answer", "product_results", "recommendations", "order_status"}:
        return {"node_trace": append_node(state, "refine_grounded_answer_with_llm")}
    result = generate_grounded_answer(
        message=state.get("message", ""),
        intent=state.get("intent", "general"),
        response_type=response_type,
        current_answer=state.get("answer", ""),
        product_cards=state.get("product_cards", []),
        grounding_documents=state.get("grounding_documents", []),
        order=state.get("grounding_order"),
        tool_summaries=[tool.response_summary for tool in state.get("tool_calls", [])],
    )
    updates: dict[str, Any] = {"node_trace": append_node(state, "refine_grounded_answer_with_llm")}
    if result.used:
        updates["answer"] = result.answer
        grounding_documents = state.get("grounding_documents", [])
        # Skip the LLM grounding check when retrieval was very confident — the
        # answer is almost certainly faithful and the verifier call is wasted spend.
        max_score = max(
            (float(doc.get("score") or 0.0) for doc in grounding_documents),
            default=0.0,
        )
        if max_score < SKIP_LLM_GROUNDING_SCORE:
            grounded, reason = grounding_check_service.is_answer_grounded(
                answer=result.answer,
                grounding_documents=grounding_documents,
            )
            if not grounded:
                updates["needs_review"] = True
                log_event(
                    "agent_grounding_failed",
                    traceId=state.get("trace_id"),
                    sessionId=state.get("session_id"),
                    reason=reason,
                )
    elif result.error:
        updates["needs_review"] = True
    return updates


def format_structured_response(state: GraphState) -> dict[str, Any]:
    answer = state.get("answer") or "I could not complete that request."
    response_type = state.get("response_type") or "fallback"
    intent_confidence = state.get("intent_confidence", 0.0)
    routing_confidence = state.get("routing_confidence", 0.0)
    needs_review = _needs_review(state, intent_confidence, routing_confidence, response_type)
    return {
        "answer": answer,
        "response_type": response_type,
        "intent_confidence": intent_confidence,
        "routing_confidence": routing_confidence,
        "needs_review": needs_review,
        "node_trace": append_node(state, "format_structured_response"),
    }


def _handle_product_search(state: GraphState) -> dict[str, Any]:
    slots = _infer_slots_from_memory(state.get("slots", {}), state)
    filters = _filters_from_slots(slots)
    query = str(slots.get("query", ""))
    result, tool_calls = call_tool(
        state.get("tool_calls", []),
        "catalog.search",
        {"query": query, "filters": filters},
        lambda: tools.catalog.search(query=query, filters=filters),
        trace_id=state.get("trace_id"),
        session_id=state.get("session_id"),
        user_id=state.get("user_id"),
    )
    if result.status == "success":
        return {
            "answer": "I found matching products.",
            "response_type": "product_results",
            "product_cards": result.data,
            "last_selected_product": result.data[0] if result.data else None,
            "tool_calls": tool_calls,
            "node_trace": append_node(state, "ground_response_in_tool_results"),
        }
    # Fallback: when the catalog lexical search returns no hits, try the
    # recommender's CLIP semantic text search. This catches descriptor-heavy
    # queries like "lightweight summer shirt for hiking".
    if result.status == "empty_result" and query:
        semantic, tool_calls = call_tool(
            tool_calls,
            "recommend.by_text",
            {"query": query},
            lambda: tools.recommendation.by_text(query=query),
            trace_id=state.get("trace_id"),
            session_id=state.get("session_id"),
            user_id=state.get("user_id"),
        )
        if semantic.status == "success" and semantic.data:
            return {
                "answer": "I found related products you might like.",
                "response_type": "product_results",
                "product_cards": semantic.data,
                "last_selected_product": semantic.data[0],
                "tool_calls": tool_calls,
                "node_trace": append_node(state, "ground_response_in_tool_results"),
            }
    return _fallback_from_tool(state, result, tool_calls, "I could not find a matching product.")


_REFINEMENT_KEYWORDS_RE = re.compile(
    r"\b(cheaper|cheapest|pricier|less\s+expensive|more\s+expensive|"
    r"under|below|above|over|less\s+than|more\s+than|"
    r"another|other|others|different|similar|any|"
    r"smaller|larger|bigger|shorter|longer|lighter|heavier|warmer|cooler)\b",
    re.IGNORECASE,
)


def _handle_recommendation(state: GraphState) -> dict[str, Any]:
    slots = _infer_slots_from_memory(state.get("slots", {}), state)
    # Refinement of a previous search ("any blue ones?", "cheaper?", "size M only")
    # — the recommender does not accept filter args, so a literal catalog
    # filter-search honours the new filter while inferred-category keeps
    # the user in the same product family as the prior turn.
    has_filter = any(slots.get(k) for k in ("color", "size", "price_min", "price_max"))
    query_text = str(slots.get("query") or state.get("normalized_message") or "")
    has_refinement_language = bool(_REFINEMENT_KEYWORDS_RE.search(query_text))
    has_product_ref = bool(slots.get("product_id") or slots.get("variant_id") or slots.get("product_slug"))
    if (has_filter or has_refinement_language) and not has_product_ref and state.get("previous_products"):
        log_event("recommendation_routed_to_search_refinement", sessionId=state.get("session_id"))
        # BE /products/search ignores category filter (chat-agent nouns rarely
        # match Spring's strict slugs), so send the category tail as the search
        # text: "outerwear-jackets" -> "jackets", "midlayer-pullovers" ->
        # "pullovers". The refinement query itself ("anything cheaper") would
        # not match any product name.
        inferred_category = str(slots.get("category") or "")
        refined_query = inferred_category.rsplit("-", 1)[-1] if inferred_category else ""
        refined_slots = {**slots, "query": refined_query}
        return _handle_product_search({**state, "slots": refined_slots})
    recent_ids = [product.product_id for product in state.get("previous_products", [])]
    use_similar = _should_use_similar_recommendation(state, recent_ids)
    tool_name = "recommend.similar" if use_similar else "recommend.personalized"
    request = (
        {
            "productId": slots.get("product_id"),
            "variantId": slots.get("variant_id"),
            "recentProductIds": recent_ids,
        }
        if use_similar
        else {
            "userId": state.get("user_id"),
            "recentProductIds": recent_ids,
        }
    )
    result, tool_calls = call_tool(
        state.get("tool_calls", []),
        tool_name,
        request,
        lambda: tools.recommendation.similar(
            product_id=slots.get("product_id"),
            variant_id=slots.get("variant_id"),
            recent_product_ids=recent_ids,
        )
        if use_similar
        else tools.recommendation.personalized(
            user_id=state.get("user_id"),
            recent_product_ids=recent_ids,
        ),
        trace_id=state.get("trace_id"),
        session_id=state.get("session_id"),
        user_id=state.get("user_id"),
    )
    if result.status == "success":
        return {
            "answer": "Here are recommended products.",
            "response_type": "recommendations",
            "product_cards": result.data,
            "last_selected_product": result.data[0] if result.data else None,
            "tool_calls": tool_calls,
            "node_trace": append_node(state, "ground_response_in_tool_results"),
        }
    fallback_reason = f"{tool_name} returned {result.status}"
    # Semantic step: when the customer gave a real query the recommender
    # could not fulfil, try CLIP-based text search first. "hoodie" -> the
    # embedding lands next to sweatshirts and pullovers, so the customer
    # sees items that actually resemble what they asked for.
    user_query = str(slots.get("query") or "").strip()
    if user_query and user_query.lower() not in {"recommend", "recommendation"}:
        semantic, tool_calls = call_tool(
            tool_calls,
            "recommend.by_text",
            {"query": user_query, "fallbackFor": tool_name, "fallbackReason": fallback_reason},
            lambda: tools.recommendation.by_text(query=user_query),
            trace_id=state.get("trace_id"),
            session_id=state.get("session_id"),
            user_id=state.get("user_id"),
        )
        if semantic.status == "success" and semantic.data:
            return {
                "answer": f'Here are products related to "{user_query}".',
                "response_type": "recommendations",
                "product_cards": semantic.data,
                "last_selected_product": semantic.data[0],
                "tool_calls": tool_calls,
                "fallback_count": state.get("fallback_count", 0) + 1,
                "node_trace": append_node(state, "ground_response_in_tool_results"),
            }
    fallback_filters = {**_filters_from_slots(slots), "in_stock": True}
    fallback_result, tool_calls = call_tool(
        tool_calls,
        "catalog.search",
        {"query": "", "filters": fallback_filters, "fallbackFor": tool_name, "fallbackReason": fallback_reason},
        lambda: tools.catalog.search(query="", filters=fallback_filters),
        trace_id=state.get("trace_id"),
        session_id=state.get("session_id"),
        user_id=state.get("user_id"),
    )
    if fallback_result.status == "success":
        user_query = str(slots.get("query") or "").strip()
        if user_query and user_query.lower() not in {"recommend", "recommendation"}:
            fallback_answer = (
                f'I could not find items that specifically match "{user_query}", '
                "so here are some popular in-stock alternatives — please note these "
                "may not exactly match what you asked for."
            )
        else:
            fallback_answer = "I could not get similar recommendations, so here are popular in-stock products."
        return {
            "answer": fallback_answer,
            "response_type": "recommendations",
            "product_cards": fallback_result.data,
            "last_selected_product": fallback_result.data[0] if fallback_result.data else None,
            "tool_calls": tool_calls,
            "fallback_count": state.get("fallback_count", 0) + 1,
            "node_trace": append_node(state, "ground_response_in_tool_results"),
        }
    return _fallback_from_tool(state, fallback_result, tool_calls, "I do not have enough product context to recommend yet.")


def _should_use_similar_recommendation(state: GraphState, recent_ids: list[str]) -> bool:
    slots = state.get("slots", {})
    if slots.get("product_id") or slots.get("variant_id"):
        return True
    text = state.get("normalized_message", state.get("message", "")).lower()
    similar_terms = ("similar", "tuong tu", "giong", "like this", "same style", "cai nay")
    return bool(recent_ids and any(term in text for term in similar_terms))


def _handle_cart_action(state: GraphState) -> dict[str, Any]:
    slots = state.get("slots", {})
    tool_calls = state.get("tool_calls", [])
    _, tool_calls = call_tool(
        tool_calls,
        "cart.get",
        {"userId": state.get("user_id")},
        lambda: tools.cart.get(user_id=state.get("user_id")),
        trace_id=state.get("trace_id"),
        session_id=state.get("session_id"),
        user_id=state.get("user_id"),
    )

    product = _selected_memory_product(state, slots)
    product_cards: list[ProductCard] = [product] if product else []
    if not product and (slots.get("query") or _filters_from_slots(slots)):
        search_result, tool_calls = call_tool(
            tool_calls,
            "catalog.search",
            {"query": str(slots.get("query", "")), "filters": _filters_from_slots(slots)},
            lambda: tools.catalog.search(query=str(slots.get("query", "")), filters=_filters_from_slots(slots)),
            trace_id=state.get("trace_id"),
            session_id=state.get("session_id"),
            user_id=state.get("user_id"),
        )
        if search_result.status != "success":
            return _fallback_from_tool(state, search_result, tool_calls, "I could not find that product.")
        product_cards = search_result.data
        product = product_cards[0] if product_cards else None

    if not product:
        return {
            "answer": "Please refer to a product I have shown, or include a product name.",
            "response_type": "clarification",
            "tool_calls": tool_calls,
            "fallback_count": state.get("fallback_count", 0) + 1,
            "node_trace": append_node(state, "ground_response_in_tool_results"),
        }

    action_type = slots.get("action_type", "add")
    quantity = int(slots.get("quantity", 1))
    selected_variant_id = slots.get("variant_id") or product.variant_id
    if action_type == "remove":
        draft_result, tool_calls = call_tool(
            tool_calls,
            "cart.remove_item_draft",
            {"productId": product.product_id},
            lambda: tools.cart.remove_item_draft(product_id=product.product_id),
            trace_id=state.get("trace_id"),
            session_id=state.get("session_id"),
            user_id=state.get("user_id"),
        )
        answer = f"Please confirm before I remove {product.name} from cart."
    elif action_type == "update_quantity":
        draft_result, tool_calls = call_tool(
            tool_calls,
            "cart.update_quantity_draft",
            {"productId": product.product_id, "quantity": quantity},
            lambda: tools.cart.update_quantity_draft(product_id=product.product_id, quantity=quantity),
            trace_id=state.get("trace_id"),
            session_id=state.get("session_id"),
            user_id=state.get("user_id"),
        )
        answer = f"Please confirm before I update {product.name} quantity to {quantity}."
    else:
        draft_result, tool_calls = call_tool(
            tool_calls,
            "cart.add_draft",
            {"productId": product.product_id, "variantId": selected_variant_id, "quantity": quantity},
            lambda: tools.cart.add_draft(product_id=product.product_id, variant_id=selected_variant_id, quantity=quantity),
            trace_id=state.get("trace_id"),
            session_id=state.get("session_id"),
            user_id=state.get("user_id"),
        )
        answer = f"I found {product.name}. Please confirm before I add it to cart."

    if draft_result.status != "success":
        return _fallback_from_tool(state, draft_result, tool_calls, "I could not prepare that cart action.")
    return {
        "answer": answer,
        "response_type": "draft_action",
        "product_cards": [product],
        "last_selected_product": product,
        "draft_action": draft_result.data,
        "needs_confirmation": True,
        "tool_calls": tool_calls,
        "node_trace": append_node(state, "ground_response_in_tool_results"),
    }


def _handle_order_status(state: GraphState) -> dict[str, Any]:
    slots = state.get("slots", {})
    tool_calls = state.get("tool_calls", [])
    if slots.get("order_id") == "latest":
        result, tool_calls = call_tool(
            tool_calls,
            "order.list",
            {"userId": state.get("user_id")},
            lambda: tools.order.list(user_id=state.get("user_id")),
            trace_id=state.get("trace_id"),
            session_id=state.get("session_id"),
            user_id=state.get("user_id"),
        )
        order = result.data[0] if result.status == "success" and result.data else None
    else:
        result, tool_calls = call_tool(
            tool_calls,
            "order.lookup",
            {"orderId": slots.get("order_id")},
            lambda: tools.order.lookup(order_id=slots["order_id"], user_id=state.get("user_id")),
            trace_id=state.get("trace_id"),
            session_id=state.get("session_id"),
            user_id=state.get("user_id"),
        )
        order = result.data if result.status == "success" else None

    if result.status != "success":
        return _fallback_from_tool(state, result, tool_calls, "I could not find that order.")
    order_number = order.get("orderNumber") or order.get("orderId")
    answer = f"Order {order_number} is {order['status']}."
    if order.get("paymentStatus"):
        answer += f" Payment is {order['paymentStatus']}."
    if order.get("eta"):
        answer += f" ETA is {order['eta']}."
    return {
        "answer": answer,
        "response_type": "order_status",
        "last_selected_order": order,
        "grounding_order": order,
        "tool_calls": tool_calls,
        "node_trace": append_node(state, "ground_response_in_tool_results"),
    }


def _handle_support_handoff(state: GraphState) -> dict[str, Any]:
    transcript = [{"role": "user", "content": state["message"]}]
    result, tool_calls = call_tool(
        state.get("tool_calls", []),
        "support.create_draft",
        {"summary": state["message"][:160]},
        lambda: tools.support.create_draft(summary=state["message"][:160], transcript=transcript),
        trace_id=state.get("trace_id"),
        session_id=state.get("session_id"),
        user_id=state.get("user_id"),
    )
    if result.status != "success":
        return _fallback_from_tool(state, result, tool_calls, "I could not prepare a support handoff.")
    return {
        "answer": "Please confirm before I create a support conversation for staff.",
        "response_type": "handoff",
        "draft_action": result.data,
        "needs_confirmation": True,
        "tool_calls": tool_calls,
        "node_trace": append_node(state, "ground_response_in_tool_results"),
    }


def _handle_policy_or_faq(state: GraphState) -> dict[str, Any]:
    retrieval_query = state.get("rewritten_query") or state["message"]
    result, tool_calls = call_tool(
        state.get("tool_calls", []),
        "knowledge.retrieve",
        {"query": retrieval_query, "limit": 3},
        lambda: tools.knowledge.retrieve(query=retrieval_query, limit=3),
        trace_id=state.get("trace_id"),
        session_id=state.get("session_id"),
        user_id=state.get("user_id"),
    )
    if result.status == "empty_result":
        topics = _available_knowledge_titles()
        suggestion_text = ", ".join(topics) if topics else ""
        answer = (
            f"I could not find a matching policy answer. Try one of: {suggestion_text}."
            if suggestion_text
            else "I could not find a matching policy answer."
        )
        return {
            "answer": answer,
            "response_type": "empty_result",
            "suggested_topics": topics,
            "tool_calls": tool_calls,
            "fallback_count": state.get("fallback_count", 0) + 1,
            "node_trace": append_node(state, "ground_response_in_tool_results"),
        }
    if result.status != "success":
        return _fallback_from_tool(state, result, tool_calls, "I could not find a matching policy answer.")
    return {
        "answer": result.data[0]["body"],
        "response_type": "answer",
        "grounding_documents": result.data,
        "citations": _citations_from_grounding(result.data),
        "tool_calls": tool_calls,
        "node_trace": append_node(state, "ground_response_in_tool_results"),
    }


def _available_knowledge_titles() -> list[str]:
    from app.knowledge.loader import load_knowledge_documents

    try:
        return [doc.title for doc in load_knowledge_documents()][:7]
    except Exception:  # pragma: no cover - defensive
        return []


def _citations_from_grounding(documents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    citations: list[dict[str, Any]] = []
    for doc in documents[:3]:
        body = str(doc.get("body", ""))
        snippet = " ".join(body.split())[:240]
        citations.append(
            {
                "sourceId": doc.get("sourceId", "unknown"),
                "sourceType": doc.get("sourceType", "unknown"),
                "title": doc.get("title", ""),
                "snippet": snippet,
                "score": doc.get("score"),
            }
        )
    return citations


def _fallback_from_tool(
    state: GraphState,
    result: ToolResult,
    tool_calls,
    message: str,
) -> dict[str, Any]:
    response_type = {
        "empty_result": "empty_result",
        "unauthorized": "auth_required",
        "timeout": "tool_error",
        "backend_error": "tool_error",
        "validation_error": "tool_error",
    }.get(result.status, "fallback")
    return {
        "answer": "Please sign in before I can access that information." if result.status == "unauthorized" else message,
        "response_type": response_type,
        "needs_review": response_type in {"tool_error", "fallback"},
        "tool_calls": tool_calls,
        "fallback_count": state.get("fallback_count", 0) + 1,
        "node_trace": append_node(state, "ground_response_in_tool_results"),
    }


def _intent_confidence(intent: str, message: str) -> float:
    if intent == "general":
        return CONFIDENCE_LOW
    if intent == "product_search":
        filters = ("size", "mau", "color", "duoi", "tren", "con hang")
        return PRODUCT_FILTER_INTENT_CONFIDENCE if any(term in message for term in filters) else PRODUCT_QUERY_INTENT_CONFIDENCE
    if intent in {"cart_action", "order_status", "support_handoff"}:
        return SPECIALIZED_INTENT_CONFIDENCE
    if intent in {"recommendation", "policy_or_faq"}:
        return RECOMMENDATION_OR_POLICY_INTENT_CONFIDENCE
    if intent == "fallback":
        return CONFIDENCE_CERTAIN
    return REVIEW_CONFIDENCE_THRESHOLD


def _route_confidence(intent: str, slots: dict[str, Any], route: str) -> float:
    if route == "clarification":
        return CONFIDENCE_MEDIUM
    if intent == "general":
        return GENERAL_ROUTE_CONFIDENCE
    if intent == "product_search" and (slots.get("query") or _filters_from_slots(slots)):
        return CONFIDENCE_HIGH
    if intent == "cart_action" and _has_product_reference(slots):
        return CONFIDENCE_HIGH
    if intent == "order_status" and slots.get("order_id"):
        return CONFIDENCE_HIGH
    return DEFAULT_ROUTE_CONFIDENCE


def _needs_review(
    state: GraphState,
    intent_confidence: float,
    routing_confidence: float,
    response_type: str,
) -> bool:
    if state.get("needs_review"):
        return True
    if response_type in {"fallback", "tool_error", "empty_result"}:
        return True
    if intent_confidence < REVIEW_CONFIDENCE_THRESHOLD or routing_confidence < REVIEW_CONFIDENCE_THRESHOLD:
        return True
    fallback_count = state.get("fallback_count", 0)
    if fallback_count > 1:
        return True
    if fallback_count == 1 and intent_confidence < CONFIDENCE_MEDIUM:
        return True
    return False


def _infer_slots_from_memory(slots: dict[str, Any], state: GraphState) -> dict[str, Any]:
    if slots.get("category"):
        return slots
    categories = [
        product.category
        for product in state.get("previous_products", [])
        if getattr(product, "category", None)
    ]
    if not categories:
        return slots
    inferred = Counter(categories).most_common(1)[0][0]
    return {**slots, "category": inferred}


def _filters_from_slots(slots: dict[str, Any]) -> dict[str, Any]:
    return {
        key: slots[key]
        for key in ("category", "color", "size", "gender", "price_min", "price_max", "in_stock")
        if key in slots
    }


def _has_product_reference(slots: dict[str, Any]) -> bool:
    return bool(
        slots.get("product_id")
        or slots.get("product_slug")
        or slots.get("product_reference")
        or slots.get("query")
        or slots.get("category")
        or slots.get("ordinal") is not None
    )


def _resolve_contextual_product(state: GraphState, slots: dict[str, Any]) -> dict[str, Any]:
    selected = _selected_memory_product(state, slots)
    if selected:
        slots["product_id"] = selected.product_id
        slots["product_slug"] = selected.slug
    return slots


def _selected_memory_product(state: GraphState, slots: dict[str, Any]) -> ProductCard | None:
    previous_products = state.get("previous_products", [])
    if slots.get("product_id"):
        return next((product for product in previous_products if product.product_id == slots["product_id"]), None)
    if slots.get("product_slug"):
        return next((product for product in previous_products if product.slug == slots["product_slug"]), None)
    if slots.get("product_reference") == "current" and previous_products:
        return state.get("last_selected_product") or previous_products[0]
    ordinal = slots.get("ordinal")
    if ordinal is not None and 0 <= ordinal < len(previous_products):
        return previous_products[ordinal]
    if state.get("last_selected_product") and (not slots.get("query") or slots.get("action_type") in {"remove", "update_quantity"}):
        return state["last_selected_product"]
    return None

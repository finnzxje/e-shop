from __future__ import annotations

import os
import time
from collections.abc import Callable
from functools import cached_property
from threading import Lock
from typing import Any

import httpx

from app.knowledge import LocalHybridKnowledgeIndex, LocalVectorKnowledgeIndex, load_policy_faq_records
from app.services.trace_context_service import get_trace_headers

from .base_client import BackendClient, BackendClientError
from .mock_backend_client import MockBackendClient


class SpringBackendClient(BackendClient):
    def __init__(
        self,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
        retries: int | None = None,
        auth_token: str | None = None,
        circuit_failure_threshold: int | None = None,
        circuit_cooldown_seconds: float | None = None,
        clock: Callable[[], float] | None = None,
    ) -> None:
        self.base_url = (base_url or os.getenv("BACKEND_BASE_URL") or "http://localhost:8080").rstrip("/")
        self.timeout_seconds = timeout_seconds or float(os.getenv("BACKEND_TIMEOUT_SECONDS", "2.0"))
        self.retries = retries if retries is not None else int(os.getenv("BACKEND_RETRIES", "1"))
        self.auth_token = auth_token
        self.circuit_failure_threshold = circuit_failure_threshold or int(os.getenv("BACKEND_CIRCUIT_FAILURE_THRESHOLD", "3"))
        self.circuit_cooldown_seconds = circuit_cooldown_seconds or float(os.getenv("BACKEND_CIRCUIT_COOLDOWN_SECONDS", "10.0"))
        self._clock = clock or time.monotonic
        self._circuit_lock = Lock()
        self._consecutive_failures = 0
        self._circuit_opened_at: float | None = None

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        return self._request("GET", path, params=params)

    def _get_optional_feature(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        fallback_status_codes: set[int] | None = None,
    ) -> Any | None:
        return self._request(
            "GET",
            path,
            params=params,
            fallback_status_codes=fallback_status_codes or {404, 501},
        )

    def _post(self, path: str, payload: dict[str, Any] | None = None) -> Any:
        return self._request("POST", path, json=payload or {})

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        fallback_status_codes: set[int] | None = None,
    ) -> Any:
        self._raise_if_circuit_open()
        headers = {"x-agent-client": "chat-agent", **get_trace_headers()}
        # Per-request auth token forwarded by FastAPI endpoint from the
        # original storefront Authorization header. Falls back to the
        # constructor-level token used by tests.
        from app.services.trace_context_service import get_auth_token

        request_token = get_auth_token() or self.auth_token
        if request_token:
            headers["Authorization"] = f"Bearer {request_token}"

        last_error: Exception | None = None
        last_status_code: int | None = None
        for _ in range(self.retries + 1):
            try:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    response = client.request(method, f"{self.base_url}{path}", params=params, json=json, headers=headers)
                if response.status_code in (401, 403):
                    self._record_circuit_success()
                    raise BackendClientError("backend request unauthorized", status="unauthorized")
                if fallback_status_codes and response.status_code in fallback_status_codes:
                    return None
                try:
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    last_error = exc
                    last_status_code = response.status_code
                    continue
                self._record_circuit_success()
                return response.json()
            except httpx.TimeoutException as exc:
                last_error = exc
            except BackendClientError:
                raise
            except httpx.HTTPError as exc:
                last_error = exc

        status = "timeout" if isinstance(last_error, httpx.TimeoutException) else "backend_error"
        self._record_circuit_failure()
        raise BackendClientError(str(last_error or "backend request failed"), status=status, status_code=last_status_code)

    def _raise_if_circuit_open(self) -> None:
        with self._circuit_lock:
            if self._circuit_opened_at is None:
                return
            elapsed = self._clock() - self._circuit_opened_at
            if elapsed < self.circuit_cooldown_seconds:
                raise BackendClientError("backend circuit open", status="backend_error")
            self._circuit_opened_at = None

    def _record_circuit_success(self) -> None:
        with self._circuit_lock:
            self._consecutive_failures = 0
            self._circuit_opened_at = None

    def _record_circuit_failure(self) -> None:
        with self._circuit_lock:
            self._consecutive_failures += 1
            if self._consecutive_failures >= self.circuit_failure_threshold:
                self._circuit_opened_at = self._clock()

    def catalog_search(self, query: str, filters: dict[str, Any] | None = None, limit: int | None = None) -> list[dict[str, Any]]:
        if limit is None:
            limit = _product_search_limit()
        # Spring /products/search supports text matching (`q`) but ignores filters.
        # Spring /products/filter supports strict filters but no text matching.
        # Strategy: when we have a text query, prefer /search (over-fetch) and
        # filter client-side by gender / color / size. When we have ONLY filters
        # (no text), call /filter directly.
        normalized_filters = _build_filter_params(filters or {})
        # Drop category — chat-agent normalizes nouns ("shirt") that rarely
        # match Spring's strict category slugs ("s-s-tops").
        normalized_filters.pop("category", None)
        gender_needle = normalized_filters.pop("gender", None)
        color_needle = normalized_filters.pop("color", None)
        size_needle = normalized_filters.pop("sizes", None)
        # Anything remaining (priceMin/priceMax/inStock) we still want server-side.
        remaining_filters = normalized_filters

        if query:
            # Over-fetch from /search; we will narrow client-side. 100 is the
            # Spring /search default cap.
            params = {"q": query, "size": 100}
            payload = self._get("/api/catalog/products/search", params)
            # Spring search matches full phrase. If the user typed "boardshorts
            # for men" the whole phrase rarely matches a product name. Retry
            # with stop words stripped so the noun ("boardshorts") still hits.
            if not _extract_list(payload, "products"):
                cleaned = _strip_query_stopwords(query)
                if cleaned and cleaned != query:
                    payload = self._get("/api/catalog/products/search", {"q": cleaned, "size": 100})
        elif remaining_filters or gender_needle:
            params = {"size": 100}
            if gender_needle:
                params["gender"] = gender_needle
            params.update(remaining_filters)
            payload = self._get("/api/catalog/products/filter", params)
            gender_needle = None  # already applied server-side
        else:
            payload = self._get("/api/catalog/products/search", {"q": "", "size": limit})

        products = [_normalize_product(p) for p in _extract_list(payload, "products")]

        if gender_needle:
            products = [p for p in products if str(p.get("gender", "")).lower() == gender_needle]
        if size_needle:
            wanted = str(size_needle).strip().upper()
            def _has_size(product: dict[str, Any]) -> bool:
                sizes = product.get("sizes") or []
                if not sizes:
                    return True  # missing data: keep
                return any(str(s).upper() == wanted for s in sizes)
            products = [p for p in products if _has_size(p)]
        if color_needle:
            needle = str(color_needle).lower()
            def _color_decision(product: dict[str, Any]) -> bool:
                color_list = product.get("colors") or []
                if not color_list:
                    return True  # missing data: keep
                haystack = " ".join(str(c).lower() for c in color_list) + " " + str(product.get("name", "")).lower()
                return needle in haystack
            products = [p for p in products if _color_decision(p)]
        return products[:limit]

    def catalog_filter(self, filters: dict[str, Any], limit: int | None = None) -> list[dict[str, Any]]:
        if limit is None:
            limit = _product_search_limit()
        params = _build_filter_params(filters)
        params["size"] = limit
        payload = self._get("/api/catalog/products/filter", params)
        return [_normalize_product(product) for product in _extract_list(payload, "products")]

    def catalog_detail(self, slug: str) -> dict[str, Any] | None:
        payload = self._get(f"/api/catalog/products/{slug}")
        return _normalize_product(payload) if isinstance(payload, dict) else None

    def recommend_similar(
        self,
        product_id: str | None = None,
        variant_id: str | None = None,
        recent_product_ids: list[str] | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        if limit is None:
            limit = _recommendation_limit()
        params = {
            "productId": product_id,
            "variantId": variant_id,
            "recentProductIds": recent_product_ids or [],
            "limit": limit,
        }
        if not variant_id:
            return []
        try:
            payload = self._get("/api/recommendations/similar", {key: value for key, value in params.items() if value})
        except BackendClientError:
            return []
        return [_normalize_product(product) for product in _extract_list(payload, "products")]

    def recommend_personalized(
        self,
        user_id: str | None = None,
        recent_product_ids: list[str] | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        if limit is None:
            limit = _recommendation_limit()
        params = {
            "userId": user_id,
            "recentProductIds": recent_product_ids or [],
            "limit": limit,
        }
        payload = self._get_optional_feature(
            "/api/recommendations/personalized",
            {key: value for key, value in params.items() if value},
        )
        if payload is None:
            return []
        return [_normalize_product(product) for product in _extract_list(payload, "products")]

    def recommend_by_text(
        self,
        query: str,
        limit: int | None = None,
        min_similarity: float = 0.0,
    ) -> list[dict[str, Any]]:
        """Call the recommender's /recommend/by-text endpoint directly.

        Falls back to an empty list on any failure (recommender down, env not
        set, etc.) so semantic search is best-effort and never blocks the chat.
        """
        if limit is None:
            limit = _product_search_limit()
        base_url = os.getenv("RECOMMENDER_BASE_URL", "").strip()
        if not base_url:
            return []
        try:
            with httpx.Client(timeout=float(os.getenv("RECOMMENDER_TIMEOUT_SECONDS", "5"))) as client:
                response = client.post(
                    f"{base_url.rstrip('/')}/recommend/by-text",
                    json={"query": query, "k": limit, "min_similarity": min_similarity},
                )
                response.raise_for_status()
                body = response.json()
        except Exception:  # pragma: no cover - defensive
            return []
        # Recommender shape: { recommendations: [{ variant_id, similarity_score, product_name, ... }] }
        # The recommender response does NOT contain `slug`, which the storefront
        # uses to link to product detail pages. Enrich each result with the slug
        # from a cached BE catalog map so chat product cards remain clickable.
        results: list[dict[str, Any]] = []
        for item in body.get("recommendations", []):
            if not isinstance(item, dict):
                continue
            results.append({
                "productId": item.get("product_id") or item.get("variant_id"),
                "variantId": item.get("variant_id"),
                "name": item.get("product_name") or "",
                "slug": item.get("slug") or "",
                "category": item.get("category_name") or "",
                "gender": item.get("gender") or "",
                "price": int(item.get("price") or 0),
                "currency": "VND",
                "imageUrl": item.get("image_path"),
                "colors": [],
                "sizes": [],
                "inStock": True,
                "stock": 0,
                "recommendationScore": float(item.get("similarity_score") or 0),
                "recommendationReason": "semantic text match",
            })
        if results:
            self._enrich_with_catalog_slugs(results)
        return results

    def _enrich_with_catalog_slugs(self, products: list[dict[str, Any]]) -> None:
        """Backfill missing slug by matching productId first, then product name."""
        missing_slug = [p for p in products if not p.get("slug")]
        if not missing_slug:
            return
        slug_by_id, slug_by_name = _product_slug_lookup(self)
        if not slug_by_id and not slug_by_name:
            return
        for product in missing_slug:
            slug: str | None = None
            pid = product.get("productId")
            if pid:
                slug = slug_by_id.get(str(pid))
            if not slug and product.get("name"):
                slug = slug_by_name.get(_normalize_product_name(product["name"]))
            if slug:
                product["slug"] = slug

    def cart_get(self, user_id: str | None) -> dict[str, Any]:
        payload = self._get("/api/cart")
        return payload if isinstance(payload, dict) else {}

    def order_list(self, user_id: str | None) -> list[dict[str, Any]]:
        payload = self._get("/api/orders")
        return [_normalize_order(order) for order in _extract_list(payload, "orders")]

    def order_lookup(self, order_id: str, user_id: str | None) -> dict[str, Any] | None:
        payload = self._get(f"/api/orders/by-number/{order_id}")
        return _normalize_order(payload) if isinstance(payload, dict) else None

    def latest_purchased_item(self, product_id: str | None, user_id: str | None) -> dict[str, Any] | None:
        if not product_id:
            return None
        payload = self._get(f"/api/orders/purchased-items/{product_id}/latest")
        return payload if isinstance(payload, dict) else None

    def knowledge_retrieve(self, query: str, limit: int = 2) -> list[dict[str, Any]]:
        try:
            payload = self._get_optional_feature("/api/knowledge/search", {"q": query, "limit": limit}, {404, 501})
        except BackendClientError:
            payload = None
        if payload is not None:
            documents = _extract_list(payload, "documents")
            if documents:
                return documents
        if os.getenv("KNOWLEDGE_LOCAL_FALLBACK", "true").lower() in {"1", "true", "yes"}:
            return self._local_knowledge_retrieve(query=query, limit=limit)
        return []

    def support_create(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self._post("/api/support/conversations", _support_payload(payload))
        return response if isinstance(response, dict) else {}

    def confirm_draft_action(self, draft_action_id: str) -> dict[str, Any]:
        response = self._post(f"/api/chat/actions/{draft_action_id}/confirm")
        return response if isinstance(response, dict) else {}

    def cancel_draft_action(self, draft_action_id: str) -> dict[str, Any]:
        response = self._post(f"/api/chat/actions/{draft_action_id}/cancel")
        return response if isinstance(response, dict) else {}

    @cached_property
    def _local_mock_client(self) -> MockBackendClient:
        return MockBackendClient()

    @cached_property
    def _local_hybrid_knowledge_index(self) -> LocalHybridKnowledgeIndex:
        return LocalHybridKnowledgeIndex.from_records(load_policy_faq_records())

    @cached_property
    def _local_vector_knowledge_index(self) -> LocalVectorKnowledgeIndex:
        return LocalVectorKnowledgeIndex.from_records(load_policy_faq_records())

    def _local_knowledge_retrieve(self, query: str, limit: int) -> list[dict[str, Any]]:
        if os.getenv("KNOWLEDGE_RETRIEVAL_MODE", "hybrid").lower() == "vector":
            return self._local_vector_knowledge_index.retrieve(query, limit=limit)
        return self._local_hybrid_knowledge_index.retrieve(query, limit=limit)


_QUERY_STOP_WORDS = {
    "for", "the", "a", "an", "any", "some", "me", "my", "i", "we", "us",
    "of", "and", "or", "with", "without", "in", "on", "to", "from",
    "give", "show", "find", "want", "need", "looking", "look", "please",
    "men", "man", "male", "women", "woman", "female", "guys", "guy", "ladies", "lady",
    "blue", "red", "black", "white", "green", "yellow", "pink", "purple", "orange",
    "gray", "grey", "brown", "navy", "beige", "olive",
    "xs", "s", "m", "l", "xl", "xxl", "3xl",
}


def _strip_query_stopwords(query: str) -> str:
    words = [w for w in query.lower().split() if w not in _QUERY_STOP_WORDS]
    return " ".join(words)


_BE_GENDER_MAP = {
    "men": "mens",
    "man": "mens",
    "male": "mens",
    "women": "womens",
    "woman": "womens",
    "female": "womens",
    "unisex": "unisex",
    "kids": "kids",
}


def _product_search_limit() -> int:
    try:
        return max(1, int(os.getenv("PRODUCT_SEARCH_LIMIT", "6")))
    except ValueError:
        return 6


def _recommendation_limit() -> int:
    try:
        return max(1, int(os.getenv("RECOMMENDATION_LIMIT", "4")))
    except ValueError:
        return 4


def _build_filter_params(filters: dict[str, Any]) -> dict[str, Any]:
    """Convert chat-agent's normalized filter dict to Spring /products/filter params."""
    params: dict[str, Any] = {}
    gender = filters.get("gender")
    if gender:
        params["gender"] = _BE_GENDER_MAP.get(str(gender).lower(), str(gender).lower())
    category = filters.get("category")
    if category:
        params["category"] = category
    color = filters.get("color")
    if color:
        params["color"] = color  # Spring accepts repeating ?color=red&color=blue OR single value
    size = filters.get("size")
    if size:
        params["sizes"] = size
    if filters.get("in_stock") is not None:
        params["inStock"] = str(bool(filters["in_stock"])).lower()
    if filters.get("price_min") is not None:
        params["priceMin"] = filters["price_min"]
    if filters.get("price_max") is not None:
        params["priceMax"] = filters["price_max"]
    return params


# Cache of slug lookups for enriching recommender by-text results which lack
# slug. We index by both productId AND normalized product name because the
# recommender returns only variant_id (not product_id), so name-based lookup
# is the reliable path. Single full-catalog fetch (~600 products) lasts an hour.
_PRODUCT_SLUG_BY_ID: dict[str, str] = {}
_PRODUCT_SLUG_BY_NAME: dict[str, str] = {}
_PRODUCT_SLUG_CACHE_EXPIRES_AT: float = 0.0
_PRODUCT_SLUG_CACHE_LOCK = Lock()


def _product_slug_map_ttl_seconds() -> int:
    return int(os.getenv("PRODUCT_SLUG_CACHE_TTL_SECONDS", "3600"))


def _normalize_product_name(name: str) -> str:
    return " ".join(str(name).lower().strip().split())


def _product_slug_lookup(client: "SpringBackendClient") -> tuple[dict[str, str], dict[str, str]]:
    """Returns (slug_by_id, slug_by_normalized_name) from BE catalog, cached."""
    global _PRODUCT_SLUG_BY_ID, _PRODUCT_SLUG_BY_NAME, _PRODUCT_SLUG_CACHE_EXPIRES_AT
    now = time.monotonic()
    with _PRODUCT_SLUG_CACHE_LOCK:
        if _PRODUCT_SLUG_CACHE_EXPIRES_AT > now and (_PRODUCT_SLUG_BY_ID or _PRODUCT_SLUG_BY_NAME):
            return _PRODUCT_SLUG_BY_ID, _PRODUCT_SLUG_BY_NAME
    try:
        payload = client._get("/api/catalog/products", {"size": 2000})
    except Exception:
        return _PRODUCT_SLUG_BY_ID, _PRODUCT_SLUG_BY_NAME
    new_by_id: dict[str, str] = {}
    new_by_name: dict[str, str] = {}
    for product in _extract_list(payload, "products"):
        slug = product.get("slug")
        if not slug:
            continue
        product_id = product.get("productId") or product.get("id") or product.get("product_id")
        if product_id:
            new_by_id[str(product_id)] = str(slug)
        name = product.get("name") or product.get("productName")
        if name:
            new_by_name[_normalize_product_name(name)] = str(slug)
    if not new_by_id and not new_by_name:
        return _PRODUCT_SLUG_BY_ID, _PRODUCT_SLUG_BY_NAME
    with _PRODUCT_SLUG_CACHE_LOCK:
        _PRODUCT_SLUG_BY_ID = new_by_id
        _PRODUCT_SLUG_BY_NAME = new_by_name
        _PRODUCT_SLUG_CACHE_EXPIRES_AT = now + _product_slug_map_ttl_seconds()
    return new_by_id, new_by_name


def _clear_product_slug_cache() -> None:
    """Reset the slug cache; intended for tests."""
    global _PRODUCT_SLUG_BY_ID, _PRODUCT_SLUG_BY_NAME, _PRODUCT_SLUG_CACHE_EXPIRES_AT
    with _PRODUCT_SLUG_CACHE_LOCK:
        _PRODUCT_SLUG_BY_ID = {}
        _PRODUCT_SLUG_BY_NAME = {}
        _PRODUCT_SLUG_CACHE_EXPIRES_AT = 0.0


def _extract_list(payload: Any, preferred_key: str) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        value = payload.get(preferred_key) or payload.get("recommendations") or payload.get("items") or payload.get("content") or payload.get("data")
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    return []


def _normalize_product(product: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(product)
    variants = product.get("variants") if isinstance(product.get("variants"), list) else []
    first_variant = next((variant for variant in variants if isinstance(variant, dict)), None)

    normalized["productId"] = product.get("productId") or product.get("id")
    normalized["variantId"] = product.get("variantId") or (first_variant or {}).get("id") or (first_variant or {}).get("variantId")
    normalized["name"] = product.get("name") or product.get("productName") or ""
    normalized["slug"] = product.get("slug") or product.get("productSlug") or ""
    normalized["category"] = _category_value(product.get("category"))
    if normalized["category"] == "uncategorized" and product.get("categoryName"):
        normalized["category"] = str(product["categoryName"])
    normalized["gender"] = product.get("gender") or product.get("targetGender") or "unisex"
    normalized["price"] = product.get("price") or product.get("basePrice") or (first_variant or {}).get("price") or 0
    normalized["currency"] = product.get("currency") or (first_variant or {}).get("currency") or "VND"
    normalized["imageUrl"] = product.get("imageUrl") or _image_url(product)
    normalized["colors"] = product.get("colors") if isinstance(product.get("colors"), list) else _variant_values(variants, "color")
    normalized["sizes"] = product.get("sizes") if isinstance(product.get("sizes"), list) else _variant_values(variants, "size")
    normalized["stock"] = product.get("stock") if product.get("stock") is not None else _stock(variants)
    normalized["inStock"] = product.get("inStock") if product.get("inStock") is not None else _in_stock(product, variants)
    if product.get("similarityScore") is not None and not variants and product.get("stock") is None:
        normalized["stock"] = 1
        normalized["inStock"] = True
    if product.get("similarityScore") is not None and normalized.get("recommendationScore") is None:
        normalized["recommendationScore"] = product["similarityScore"]
    if normalized.get("recommendationReason") is None and product.get("similarityScore") is not None:
        normalized["recommendationReason"] = "similar product from recommender"
    return normalized


def _normalize_order(order: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(order)
    normalized["status"] = order.get("status") or order.get("orderStatus")
    return normalized


def _support_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if "message" in payload:
        return payload
    summary = str(payload.get("summary") or "Chat support handoff")
    transcript = payload.get("transcript")
    message = _transcript_message(transcript) or summary
    return {"subject": summary[:180], "message": message, "attachmentUrls": payload.get("attachmentUrls") or []}


def _category_value(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("slug") or value.get("name") or value.get("id") or "uncategorized")
    if value:
        return str(value)
    return "uncategorized"


def _image_url(product: dict[str, Any]) -> str | None:
    images = product.get("images")
    if not isinstance(images, list):
        return None
    valid_images = [image for image in images if isinstance(image, dict)]
    primary = next((image for image in valid_images if image.get("primary") is True), None)
    image = primary or (valid_images[0] if valid_images else None)
    return str(image.get("imageUrl")) if image and image.get("imageUrl") else None


def _variant_values(variants: list[Any], field: str) -> list[str]:
    values: list[str] = []
    for variant in variants:
        if not isinstance(variant, dict):
            continue
        raw_value = variant.get(field)
        if isinstance(raw_value, dict):
            raw_value = raw_value.get("name") or raw_value.get("slug") or raw_value.get("value")
        if raw_value and str(raw_value) not in values:
            values.append(str(raw_value))
    return values


def _stock(variants: list[Any]) -> int:
    total = 0
    for variant in variants:
        if not isinstance(variant, dict):
            continue
        raw_stock = variant.get("stock", variant.get("quantityInStock", 0))
        try:
            total += int(raw_stock or 0)
        except (TypeError, ValueError):
            continue
    return total


def _in_stock(product: dict[str, Any], variants: list[Any]) -> bool:
    if variants:
        return _stock(variants) > 0
    status = str(product.get("status") or "").upper()
    return status == "ACTIVE"


def _transcript_message(transcript: Any) -> str | None:
    if not isinstance(transcript, list):
        return None
    lines = []
    for entry in transcript:
        if not isinstance(entry, dict):
            continue
        role = entry.get("role") or "user"
        content = entry.get("content")
        if content:
            lines.append(f"{role}: {content}")
    return "\n".join(lines) if lines else None

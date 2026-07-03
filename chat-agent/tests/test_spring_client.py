from __future__ import annotations

from typing import Any

import httpx
import pytest

from app.clients.base_client import BackendClientError
from app.clients.spring_client import SpringBackendClient


def test_spring_client_opens_circuit_after_consecutive_backend_failures(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    class FailingClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            calls.append(url)
            raise httpx.ConnectError("backend down", request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", FailingClient)
    client = SpringBackendClient(
        base_url="http://backend",
        retries=0,
        circuit_failure_threshold=2,
        circuit_cooldown_seconds=30,
    )

    with pytest.raises(BackendClientError, match="backend down"):
        client.catalog_search("shirt")
    with pytest.raises(BackendClientError, match="backend down"):
        client.catalog_search("shirt")
    with pytest.raises(BackendClientError, match="backend circuit open"):
        client.catalog_search("shirt")

    assert len(calls) == 2


def test_spring_client_allows_probe_after_circuit_cooldown_and_resets_on_success(monkeypatch: pytest.MonkeyPatch) -> None:
    now = 1000.0
    responses: list[Any] = [
        httpx.ConnectError("backend down", request=httpx.Request("GET", "http://backend")),
        httpx.Response(200, json={"products": []}, request=httpx.Request("GET", "http://backend")),
        httpx.Response(200, json={"products": []}, request=httpx.Request("GET", "http://backend")),
    ]
    calls: list[str] = []

    class RecoveringClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            calls.append(url)
            response = responses.pop(0)
            if isinstance(response, Exception):
                raise response
            return response

    monkeypatch.setattr(httpx, "Client", RecoveringClient)
    client = SpringBackendClient(
        base_url="http://backend",
        retries=0,
        circuit_failure_threshold=1,
        circuit_cooldown_seconds=10,
        clock=lambda: now,
    )

    with pytest.raises(BackendClientError, match="backend down"):
        client.catalog_search("shirt")
    with pytest.raises(BackendClientError, match="backend circuit open"):
        client.catalog_search("shirt")

    now = 1011.0
    assert client.catalog_search("shirt") == []
    assert client.catalog_search("shirt") == []
    assert len(calls) == 3


def test_spring_client_unauthorized_does_not_open_circuit(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = 0

    class UnauthorizedClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            nonlocal calls
            calls += 1
            return httpx.Response(401, json={"error": "unauthorized"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", UnauthorizedClient)
    client = SpringBackendClient(
        base_url="http://backend",
        retries=0,
        circuit_failure_threshold=1,
        circuit_cooldown_seconds=30,
    )

    with pytest.raises(BackendClientError) as first:
        client.order_lookup("ES123", user_id="user-1")
    with pytest.raises(BackendClientError) as second:
        client.order_lookup("ES123", user_id="user-1")

    assert first.value.status == "unauthorized"
    assert second.value.status == "unauthorized"
    assert calls == 2


def test_spring_client_retries_transient_http_status_failures(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = [
        httpx.Response(503, json={"error": "unavailable"}, request=httpx.Request("GET", "http://backend")),
        httpx.Response(
            200,
            json={"products": [{"id": "p001", "name": "Trail Shirt", "slug": "trail-shirt"}]},
            request=httpx.Request("GET", "http://backend"),
        ),
    ]
    calls: list[str] = []

    class RecoveringStatusClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            calls.append(url)
            return responses.pop(0)

    monkeypatch.setattr(httpx, "Client", RecoveringStatusClient)
    client = SpringBackendClient(base_url="http://backend", retries=1)

    [product] = client.catalog_search("shirt")

    assert len(calls) == 2
    assert product["productId"] == "p001"


def test_spring_similar_recommendations_send_recent_product_ids_as_repeated_params(monkeypatch: pytest.MonkeyPatch) -> None:
    captured_params: dict[str, Any] | None = None

    class CapturingClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            nonlocal captured_params
            captured_params = params
            return httpx.Response(200, json={"products": []}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", CapturingClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    client.recommend_similar(variant_id="v001", recent_product_ids=["p001", "p002"])

    assert captured_params is not None
    assert captured_params["variantId"] == "v001"
    assert captured_params["recentProductIds"] == ["p001", "p002"]


def test_spring_client_returns_empty_similar_recommendations_when_backend_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UnavailableRecommendationClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            return httpx.Response(503, json={"error": "unavailable"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", UnavailableRecommendationClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    assert client.recommend_similar(variant_id="v001") == []


def test_spring_client_uses_personalized_recommendation_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    captured_url = ""
    captured_params: dict[str, Any] | None = None

    class CapturingClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            nonlocal captured_url, captured_params
            captured_url = url
            captured_params = params
            return httpx.Response(
                200,
                json={
                    "recommendations": [
                        {
                            "productId": "p009",
                            "variantId": "v009",
                            "productName": "Trail Shirt",
                            "productSlug": "trail-shirt",
                            "category": "shirts",
                            "gender": "unisex",
                            "price": 250000,
                            "inStock": True,
                            "stock": 8,
                            "recommendationRank": 1,
                            "recommendationScore": 0.91,
                            "recommendationReason": "personalized by recent views",
                        }
                    ]
                },
                request=httpx.Request(method, url),
            )

    monkeypatch.setattr(httpx, "Client", CapturingClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    [product] = client.recommend_personalized(user_id="user-1", recent_product_ids=["p001", "p002"], limit=3)

    assert captured_url == "http://backend/api/recommendations/personalized"
    assert captured_params == {"userId": "user-1", "recentProductIds": ["p001", "p002"], "limit": 3}
    assert product["productId"] == "p009"
    assert product["recommendationScore"] == 0.91
    assert product["recommendationReason"] == "personalized by recent views"


def test_spring_client_returns_empty_personalized_recommendations_when_backend_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UnavailableClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            return httpx.Response(501, json={"error": "not implemented"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", UnavailableClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    assert client.recommend_personalized(user_id="user-1", recent_product_ids=["p001"], limit=4) == []


def test_spring_client_personalized_placeholder_statuses_do_not_open_circuit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    responses = [
        httpx.Response(501, json={"error": "not implemented"}, request=httpx.Request("GET", "http://backend")),
        httpx.Response(404, json={"error": "not found"}, request=httpx.Request("GET", "http://backend")),
        httpx.Response(
            200,
            json={"products": [{"id": "p002", "name": "Rain Jacket", "slug": "rain-jacket"}]},
            request=httpx.Request("GET", "http://backend"),
        ),
    ]
    calls: list[str] = []

    class PlaceholderThenCatalogClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            calls.append(url)
            return responses.pop(0)

    monkeypatch.setattr(httpx, "Client", PlaceholderThenCatalogClient)
    client = SpringBackendClient(base_url="http://backend", retries=0, circuit_failure_threshold=1)

    assert client.recommend_personalized(user_id="user-1", recent_product_ids=["p001"], limit=4) == []
    assert client.recommend_personalized(user_id="user-1", recent_product_ids=["p001"], limit=4) == []
    [product] = client.catalog_search("jacket")

    assert calls == [
        "http://backend/api/recommendations/personalized",
        "http://backend/api/recommendations/personalized",
        "http://backend/api/catalog/products/search",
    ]
    assert product["productId"] == "p002"


def test_spring_client_propagates_unauthorized_personalized_recommendations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UnauthorizedClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            return httpx.Response(401, json={"error": "unauthorized"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", UnauthorizedClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    with pytest.raises(BackendClientError) as exc_info:
        client.recommend_personalized(user_id="user-1", recent_product_ids=["p001"], limit=4)

    assert exc_info.value.status == "unauthorized"


def test_spring_client_propagates_timeout_personalized_recommendations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class TimeoutClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            raise httpx.TimeoutException("backend timed out", request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", TimeoutClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    with pytest.raises(BackendClientError) as exc_info:
        client.recommend_personalized(user_id="user-1", recent_product_ids=["p001"], limit=4)

    assert exc_info.value.status == "timeout"


def test_spring_client_uses_backend_order_lookup_by_number(monkeypatch: pytest.MonkeyPatch) -> None:
    captured_url = ""

    class CapturingClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            nonlocal captured_url
            captured_url = url
            return httpx.Response(
                200,
                json={"orderNumber": "ES123", "orderStatus": "SHIPPED", "paymentStatus": "CAPTURED"},
                request=httpx.Request(method, url),
            )

    monkeypatch.setattr(httpx, "Client", CapturingClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    order = client.order_lookup("ES123", user_id="user-1")

    assert captured_url == "http://backend/api/orders/by-number/ES123"
    assert order == {"orderNumber": "ES123", "orderStatus": "SHIPPED", "paymentStatus": "CAPTURED", "status": "SHIPPED"}


def test_spring_client_uses_backend_latest_purchased_item_path(monkeypatch: pytest.MonkeyPatch) -> None:
    captured_url = ""

    class CapturingClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            nonlocal captured_url
            captured_url = url
            return httpx.Response(200, json={"orderNumber": "ES123"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", CapturingClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    assert client.latest_purchased_item("product-1", user_id="user-1") == {"orderNumber": "ES123"}
    assert captured_url == "http://backend/api/orders/purchased-items/product-1/latest"


def test_spring_client_normalizes_backend_catalog_and_recommendation_payloads(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = [
        httpx.Response(
            200,
            json={
                "content": [
                    {
                        "id": "p001",
                        "name": "Black Jacket",
                        "slug": "black-jacket",
                        "basePrice": 450000,
                        "category": {"slug": "jackets"},
                        "status": "ACTIVE",
                    }
                ]
            },
            request=httpx.Request("GET", "http://backend"),
        ),
        httpx.Response(
            200,
            json={
                "recommendations": [
                    {
                        "productId": "p002",
                        "variantId": "v002",
                        "productName": "White Hoodie",
                        "productSlug": "white-hoodie",
                        "price": 390000,
                        "similarityScore": 0.87,
                        "imageUrl": "https://cdn.local/white.jpg",
                    }
                ]
            },
            request=httpx.Request("GET", "http://backend"),
        ),
    ]

    class CapturingClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            return responses.pop(0)

    monkeypatch.setattr(httpx, "Client", CapturingClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    [catalog_product] = client.catalog_search("jacket")
    [recommendation] = client.recommend_similar(variant_id="v001")

    assert catalog_product["productId"] == "p001"
    assert catalog_product["price"] == 450000
    assert catalog_product["category"] == "jackets"
    assert recommendation["name"] == "White Hoodie"
    assert recommendation["slug"] == "white-hoodie"
    assert recommendation["category"] == "uncategorized"
    assert recommendation["gender"] == "unisex"
    assert recommendation["inStock"] is True
    assert recommendation["stock"] == 1
    assert recommendation["recommendationScore"] == 0.87
    assert recommendation["recommendationReason"] == "similar product from recommender"


def test_spring_client_falls_back_to_local_knowledge_when_backend_search_is_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class MissingKnowledgeClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            return httpx.Response(404, json={"error": "not found"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", MissingKnowledgeClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    documents = client.knowledge_retrieve("shipping fees standard domestic")

    assert documents
    assert documents[0]["sourceId"] == "shipping"


def test_spring_client_falls_back_to_local_knowledge_when_backend_search_is_unauthorized(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UnauthorizedKnowledgeClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def request(self, method, url, params=None, json=None, headers=None):
            return httpx.Response(401, json={"error": "unauthorized"}, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", UnauthorizedKnowledgeClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    documents = client.knowledge_retrieve("shipping fees standard domestic")

    assert documents
    assert documents[0]["sourceId"] == "shipping"


def test_recommend_by_text_enriches_missing_slug_from_backend_catalog(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Recommender by-text never returns slug; chat-agent must backfill it from BE catalog."""
    from app.clients import spring_client as sc

    sc._clear_product_slug_cache()
    monkeypatch.setenv("RECOMMENDER_BASE_URL", "http://recommender:8000")

    class DispatchClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def post(self, url, json=None, headers=None):
            return httpx.Response(
                200,
                json={
                    "query": json["query"],
                    "recommendations": [
                        {
                            "variant_id": "v-abc",
                            "product_id": "p-abc",
                            "product_name": "Trail Crew Pant",
                            "similarity_score": 0.91,
                            "price": 159,
                            "image_path": "https://img/x.jpg",
                        },
                    ],
                    "response_time_ms": 1.0,
                    "total_results": 1,
                },
                request=httpx.Request("POST", url),
            )

        def request(self, method, url, params=None, json=None, headers=None):
            if "/api/catalog/products" in url:
                return httpx.Response(
                    200,
                    json={
                        "content": [
                            {"id": "p-abc", "name": "Trail Crew Pant", "slug": "trail-crew-pant"},
                            {"id": "p-xyz", "name": "Other Product", "slug": "other-product"},
                        ]
                    },
                    request=httpx.Request(method, url),
                )
            return httpx.Response(404, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", DispatchClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    [result] = client.recommend_by_text(query="lightweight summer pants", limit=4)

    assert result["productId"] == "p-abc"
    assert result["slug"] == "trail-crew-pant"
    assert result["name"] == "Trail Crew Pant"
    assert result["recommendationScore"] == 0.91


def test_recommend_by_text_enriches_slug_by_name_when_only_variant_id_known(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Recommender returns variant_id (not product_id); name match must still work."""
    from app.clients import spring_client as sc

    sc._clear_product_slug_cache()
    monkeypatch.setenv("RECOMMENDER_BASE_URL", "http://recommender:8000")

    class DispatchClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def post(self, url, json=None, headers=None):
            return httpx.Response(
                200,
                json={
                    "query": json["query"],
                    "recommendations": [
                        {
                            # Only variant_id — no product_id (real recommender shape)
                            "variant_id": "v-only",
                            "product_name": "W's Wild Idea Work Boots",
                            "similarity_score": 0.43,
                            "price": 369,
                        },
                    ],
                    "response_time_ms": 1.0,
                    "total_results": 1,
                },
                request=httpx.Request("POST", url),
            )

        def request(self, method, url, params=None, json=None, headers=None):
            if "/api/catalog/products" in url:
                return httpx.Response(
                    200,
                    json={
                        "content": [
                            {
                                "id": "p-boots-w",
                                "name": "W's Wild Idea Work Boots",
                                "slug": "womens-wild-idea-work-boots",
                            },
                        ]
                    },
                    request=httpx.Request(method, url),
                )
            return httpx.Response(404, request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", DispatchClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    [result] = client.recommend_by_text(query="boots")

    # ProductId falls back to variant_id (no match in slug_by_id map), but name
    # match succeeds, so we still get the right slug.
    assert result["slug"] == "womens-wild-idea-work-boots"


def test_recommend_by_text_leaves_slug_empty_when_be_lookup_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When BE is unavailable for slug enrichment, do not crash — return without slug."""
    from app.clients import spring_client as sc

    sc._clear_product_slug_cache()
    monkeypatch.setenv("RECOMMENDER_BASE_URL", "http://recommender:8000")

    class PartiallyFailingClient:
        def __init__(self, timeout):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

        def post(self, url, json=None, headers=None):
            return httpx.Response(
                200,
                json={
                    "query": json["query"],
                    "recommendations": [
                        {"variant_id": "v1", "product_id": "p1", "product_name": "Foo", "similarity_score": 0.8},
                    ],
                    "response_time_ms": 1.0,
                    "total_results": 1,
                },
                request=httpx.Request("POST", url),
            )

        def request(self, method, url, params=None, json=None, headers=None):
            raise httpx.ConnectError("be down", request=httpx.Request(method, url))

    monkeypatch.setattr(httpx, "Client", PartiallyFailingClient)
    client = SpringBackendClient(base_url="http://backend", retries=0)

    [result] = client.recommend_by_text(query="anything")
    assert result["productId"] == "p1"
    assert result["slug"] == ""

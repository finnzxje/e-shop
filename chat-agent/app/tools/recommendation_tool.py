from __future__ import annotations

from app.clients import BackendClientError

from .base import BaseTool, ToolResult, to_product_card, validate_product_payload


class RecommendationTool(BaseTool):
    def similar(
        self,
        product_id: str | None = None,
        variant_id: str | None = None,
        recent_product_ids: list[str] | None = None,
    ) -> ToolResult:
        try:
            products = self.client.recommend_similar(
                product_id=product_id,
                variant_id=variant_id,
                recent_product_ids=recent_product_ids or [],
            )
        except BackendClientError as exc:
            return self.client_error(exc)
        except Exception as exc:  # pragma: no cover - defensive fallback
            return self.unexpected_error(exc)
        return _products_to_result(products)

    def personalized(
        self,
        user_id: str | None = None,
        recent_product_ids: list[str] | None = None,
    ) -> ToolResult:
        try:
            products = self.client.recommend_personalized(
                user_id=user_id,
                recent_product_ids=recent_product_ids or [],
            )
        except BackendClientError as exc:
            return self.client_error(exc)
        except Exception as exc:  # pragma: no cover - defensive fallback
            return self.unexpected_error(exc)
        return _products_to_result(products)

    def by_text(self, query: str, limit: int | None = None) -> ToolResult:
        try:
            products = self.client.recommend_by_text(query=query, limit=limit)
        except BackendClientError as exc:
            return self.client_error(exc)
        except Exception as exc:  # pragma: no cover - defensive fallback
            return self.unexpected_error(exc)
        return _products_to_result(products)


def _products_to_result(products: list[dict]) -> ToolResult:
    if not products:
        return ToolResult(status="empty_result", data=[], summary="0 recommendations")
    if any(not validate_product_payload(product) for product in products):
        return ToolResult(status="validation_error", data=[], summary="invalid recommendation payload")
    try:
        cards = []
        for index, product in enumerate(products):
            reason = _recommendation_reason(product)
            cards.append(
                to_product_card(
                    product,
                    reason=reason,
                    recommendation_rank=_recommendation_rank(product, index),
                    recommendation_score=_recommendation_score(product, index),
                    recommendation_reason=reason,
                )
            )
    except (TypeError, ValueError, KeyError) as exc:
        return ToolResult(status="validation_error", data=[], summary="invalid recommendation payload", error=str(exc))
    return ToolResult(status="success", data=cards, summary=_recommendation_summary(cards))


def _recommendation_rank(product: dict, index: int) -> int:
    return int(product.get("recommendationRank") or product.get("rank") or index + 1)


def _recommendation_score(product: dict, index: int) -> float:
    raw_score = product.get("recommendationScore", product.get("score"))
    if raw_score is not None:
        return float(raw_score)
    return round(max(0.0, 1.0 - (index * 0.05)), 4)


def _recommendation_reason(product: dict) -> str:
    return str(product.get("recommendationReason") or product.get("reason") or "similar style")


def _recommendation_summary(cards) -> str:
    ranked = ",".join(f"{card.recommendation_rank}:{card.product_id}" for card in cards)
    scores = ",".join(str(card.recommendation_score) for card in cards)
    return f"{len(cards)} recommendations; rankedRecommendations={ranked}; scores={scores}"

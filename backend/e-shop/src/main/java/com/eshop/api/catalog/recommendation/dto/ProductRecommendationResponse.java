package com.eshop.api.catalog.recommendation.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.UUID;

@Value
@Builder
public class ProductRecommendationResponse {
    UUID queryVariantId;
    List<ProductRecommendationItem> recommendations;
    Double responseTimeMs;
    Boolean fromCache;
    Integer totalResults;
}

package com.eshop.api.catalog.recommendation.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.UUID;

@Value
@Builder
public class ProductRecommendationItem {
    UUID productId;
    UUID variantId;
    String productName;
    String productSlug;
    BigDecimal price;
    Double similarityScore;
    String imageUrl;
}

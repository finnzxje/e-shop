package com.eshop.api.catalog.review.dto;

import java.time.Instant;
import java.util.UUID;

public record ProductReviewResponse(
    UUID id,
    UUID productId,
    UUID userId,
    String reviewerName,
    int rating,
    String reviewText,
    boolean verifiedPurchase,
    Instant createdAt,
    Instant updatedAt
) {
}


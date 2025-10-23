package com.eshop.api.catalog.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record ProductReviewRequest(
    @Min(1) @Max(5) int rating,
    @NotBlank @Size(max = 2000) String reviewText,
    UUID orderItemId
) {
}


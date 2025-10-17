package com.eshop.api.wishlist.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WishlistItemResponse(
    UUID id,
    UUID productId,
    String productName,
    String productSlug,
    BigDecimal basePrice,
    Boolean productActive,
    Instant addedAt
) {
}

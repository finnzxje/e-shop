package com.eshop.api.wishlist.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record WishlistItemRequest(
    @NotNull(message = "productId is required") UUID productId
) {
}

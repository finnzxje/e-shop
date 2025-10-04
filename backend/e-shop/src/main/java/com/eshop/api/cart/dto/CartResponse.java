package com.eshop.api.cart.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class CartResponse {
    UUID id;
    UUID userId;
    Integer totalItems;
    Integer totalQuantity;
    BigDecimal subtotal;
    Instant createdAt;
    Instant updatedAt;
    List<CartItemResponse> items;
}

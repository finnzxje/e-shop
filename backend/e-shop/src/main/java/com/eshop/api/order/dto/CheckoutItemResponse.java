package com.eshop.api.order.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Builder
public class CheckoutItemResponse {

    private final UUID productId;
    private final UUID variantId;
    private final Integer quantity;
    private final BigDecimal unitPrice;
    private final BigDecimal discountAmount;
    private final BigDecimal totalAmount;
    private final String currency;
}

package com.eshop.api.order.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.UUID;

@Value
@Builder
public class OrderSummaryItemResponse {
    UUID orderItemId;
    UUID productId;
    String productName;
    UUID variantId;
    Integer quantity;
    BigDecimal unitPrice;
    BigDecimal totalAmount;
    String currency;
}

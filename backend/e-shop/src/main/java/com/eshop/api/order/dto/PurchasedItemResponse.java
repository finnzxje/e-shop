package com.eshop.api.order.dto;

import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class PurchasedItemResponse {
    UUID orderId;
    String orderNumber;
    OrderStatus orderStatus;
    PaymentStatus paymentStatus;
    String slug;

    UUID orderItemId;
    UUID productId;
    String productName;
    UUID variantId;
    Integer quantity;
    BigDecimal unitPrice;
    BigDecimal totalAmount;
    String currency;
    Instant purchasedAt;
}

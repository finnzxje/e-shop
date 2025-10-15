package com.eshop.api.order.dto;

import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class CheckoutResponse {

    private final UUID orderId;
    private final String orderNumber;
    private final OrderStatus status;
    private final PaymentStatus paymentStatus;
    private final BigDecimal subtotalAmount;
    private final BigDecimal discountAmount;
    private final BigDecimal shippingAmount;
    private final BigDecimal taxAmount;
    private final BigDecimal totalAmount;
    private final String currency;
    private final BigDecimal totalAmountVnd;
    private final String paymentProvider;
    private final String paymentUrl;
    private final Instant paymentUrlExpiresAt;
    private final List<CheckoutItemResponse> items;
}

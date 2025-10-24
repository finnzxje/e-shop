package com.eshop.api.order.dto;

import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class OrderSummaryResponse {
    UUID orderId;
    String orderNumber;
    OrderStatus orderStatus;
    PaymentStatus paymentStatus;
    BigDecimal subtotalAmount;
    BigDecimal discountAmount;
    BigDecimal shippingAmount;
    BigDecimal taxAmount;
    BigDecimal totalAmount;
    String currency;
    String shippingMethod;
    String shippingTrackingNumber;
    Instant placedAt;
    Instant paidAt;
    Instant fulfilledAt;
    List<OrderSummaryItemResponse> items;
}

package com.eshop.api.order.dto;

import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class OrderStatusResponse {
    UUID orderId;
    String orderNumber;
    OrderStatus orderStatus;
    PaymentStatus paymentStatus;
    Instant paidAt;
    Instant fulfilledAt;
}

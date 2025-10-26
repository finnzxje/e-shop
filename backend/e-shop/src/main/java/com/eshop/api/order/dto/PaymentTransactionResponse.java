package com.eshop.api.order.dto;

import com.eshop.api.order.enums.PaymentMethod;
import com.eshop.api.order.enums.PaymentStatus;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class PaymentTransactionResponse {
    UUID id;
    UUID orderId;
    String orderNumber;
    String provider;
    String providerTransactionId;
    String idempotencyKey;
    BigDecimal amount;
    String currency;
    PaymentStatus status;
    PaymentMethod method;
    BigDecimal capturedAmount;
    JsonNode rawResponse;
    String errorCode;
    String errorMessage;
    Instant createdAt;
    Instant updatedAt;
    Customer customer;

    @Value
    @Builder
    public static class Customer {
        UUID id;
        String email;
        String firstName;
        String lastName;
    }
}

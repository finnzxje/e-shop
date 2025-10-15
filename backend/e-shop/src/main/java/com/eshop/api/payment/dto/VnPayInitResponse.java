package com.eshop.api.payment.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Builder
public class VnPayInitResponse {

    private final String paymentUrl;
    private final Instant expiresAt;
    private final BigDecimal amountVnd;
}

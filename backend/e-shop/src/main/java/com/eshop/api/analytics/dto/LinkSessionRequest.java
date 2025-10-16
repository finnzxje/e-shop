package com.eshop.api.analytics.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LinkSessionRequest(
    @NotNull(message = "sessionId is required") UUID sessionId
) {
}

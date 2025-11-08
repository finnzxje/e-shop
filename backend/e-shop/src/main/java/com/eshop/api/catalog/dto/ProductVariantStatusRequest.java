package com.eshop.api.catalog.dto;

import jakarta.validation.constraints.NotNull;

public record ProductVariantStatusRequest(
    @NotNull(message = "Active flag is required")
    Boolean active
) {
}

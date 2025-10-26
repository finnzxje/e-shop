package com.eshop.api.catalog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record ProductVariantCreateRequest(
    @NotNull(message = "Color id is required")
    Integer colorId,

    @Valid
    @NotNull(message = "Variants payload is required")
    @Size(min = 1, message = "At least one variant must be provided")
    List<VariantPayload> variants
) {

    public record VariantPayload(
        @Size(max = 128, message = "SKU must be 128 characters or fewer")
        String sku,

        @Size(max = 64, message = "Size must be 64 characters or fewer")
        String size,

        @Size(max = 64, message = "Fit must be 64 characters or fewer")
        String fit,

        @DecimalMin(value = "0.00", message = "Price must be zero or positive")
        BigDecimal price,

        @NotNull(message = "Quantity is required")
        @PositiveOrZero(message = "Quantity must be zero or greater")
        Integer quantity,

        Boolean active,

        @Size(max = 8, message = "Currency must be 8 characters or fewer")
        String currency
    ) {
    }
}

package com.eshop.api.catalog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductVariantUpdateRequest(
    @Size(max = 128, message = "SKU must be 128 characters or fewer")
    String sku,

    @DecimalMin(value = "0.00", message = "Price must be zero or positive")
    BigDecimal price,

    @PositiveOrZero(message = "Quantity must be zero or greater")
    Integer quantity,

    Boolean active,

    @Size(max = 64, message = "Size must be 64 characters or fewer")
    String size,

    @Size(max = 64, message = "Fit must be 64 characters or fewer")
    String fit,

    @Size(max = 8, message = "Currency must be 8 characters or fewer")
    String currency,

    Integer colorId
) {
}

package com.eshop.api.catalog.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProductVariantStockAdjustmentRequest(
    @NotNull(message = "New quantity is required")
    @Min(value = 0, message = "Quantity must be zero or greater")
    Integer newQuantity,

    @NotBlank(message = "Reason is required")
    @Size(max = 128, message = "Reason must be 128 characters or fewer")
    String reason,

    @Size(max = 1024, message = "Notes must be 1024 characters or fewer")
    String notes
) {
}

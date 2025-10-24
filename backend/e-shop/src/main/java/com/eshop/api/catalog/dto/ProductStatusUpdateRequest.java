package com.eshop.api.catalog.dto;

import com.eshop.api.catalog.enums.ProductStatus;
import jakarta.validation.constraints.NotNull;

public record ProductStatusUpdateRequest(
    @NotNull(message = "Product status is required")
    ProductStatus status
) {
}

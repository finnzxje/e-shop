package com.eshop.api.catalog.dto;

import com.eshop.api.catalog.enums.Gender;
import com.eshop.api.catalog.enums.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record ProductUpsertRequest(
    @NotBlank(message = "Product name is required")
    @Size(max = 255, message = "Product name must be 255 characters or fewer")
    String name,

    @NotBlank(message = "Slug is required")
    @Size(max = 255, message = "Slug must be 255 characters or fewer")
    String slug,

    @Size(max = 2048, message = "Description must be 2048 characters or fewer")
    String description,

    @NotNull(message = "Base price is required")
    @DecimalMin(value = "0.00", message = "Base price must be zero or positive")
    BigDecimal basePrice,

    @NotNull(message = "Category id is required")
    Integer categoryId,

    ProductStatus status,
    Boolean featured,
    Gender gender,

    @Size(max = 128, message = "Product type must be 128 characters or fewer")
    String productType,

    List<@NotBlank(message = "Taxonomy path values cannot be blank")
        @Size(max = 128, message = "Taxonomy value must be 128 characters or fewer") String> taxonomyPath,

    List<@NotBlank(message = "Tag value cannot be blank")
        @Size(max = 128, message = "Tag must be 128 characters or fewer") String> tags
) {
}

package com.eshop.api.catalog.dto;

import jakarta.validation.constraints.Size;

public record ProductImageUpdateRequest(
    @Size(max = 512, message = "Alt text must be 512 characters or fewer")
    String altText,

    Integer displayOrder,

    Boolean primary,

    Integer colorId
) {
}

package com.eshop.api.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CategoryCreateRequest {

    @NotBlank(message = "Category name is required")
    @Size(max = 255, message = "Category name must not exceed 255 characters")
    private String name;

    @NotBlank(message = "Slug is required")
    @Size(max = 255, message = "Slug must not exceed 255 characters")
    private String slug;

    @PositiveOrZero(message = "Display order must be zero or greater")
    private Integer displayOrder = 0;

    @NotNull(message = "Active flag must be provided")
    private Boolean active = true;

    private Integer parentCategoryId;
}

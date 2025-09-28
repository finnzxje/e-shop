package com.eshop.api.catalog.dto;

import com.eshop.api.catalog.enums.Gender;
import com.eshop.api.catalog.enums.ProductStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class ProductResponse {
    UUID id;
    String name;
    String slug;
    String description;
    BigDecimal basePrice;
    ProductStatus status;
    Boolean featured;
    Gender gender;
    List<String> taxonomyPath;
    String productType;
    Instant createdAt;
    Instant updatedAt;
    CategorySummary category;
    List<ProductTagResponse> tags;
    List<ProductVariantResponse> variants;
    List<ProductImageResponse> images;
}

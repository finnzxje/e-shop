package com.eshop.api.catalog.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class ProductImageResponse {
    UUID id;
    String imageUrl;
    String altText;
    Integer displayOrder;
    Boolean primary;
    Instant createdAt;
    ColorResponse color;
}

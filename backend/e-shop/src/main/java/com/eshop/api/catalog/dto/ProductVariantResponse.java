package com.eshop.api.catalog.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class ProductVariantResponse {
    UUID id;
    String variantSku;
    BigDecimal price;
    Integer quantityInStock;
    Boolean active;
    String size;
    String fit;
    String currency;
    Instant createdAt;
    ColorResponse color;
    List<VariantAttributeValueResponse> attributes;
}

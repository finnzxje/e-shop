package com.eshop.api.cart.dto;

import com.eshop.api.catalog.dto.ColorResponse;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.UUID;

@Value
@Builder
public class CartItemResponse {
    UUID id;
    UUID variantId;
    UUID productId;
    String productName;
    String productSlug;
    String variantSku;
    String size;
    String fit;
    ColorResponse color;
    Integer quantity;
    BigDecimal unitPrice;
    BigDecimal lineTotal;
    Boolean inStock;
    Integer availableQuantity;
}

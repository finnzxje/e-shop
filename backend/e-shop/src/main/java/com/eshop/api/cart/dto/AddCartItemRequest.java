package com.eshop.api.cart.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.util.UUID;

@Data
public class AddCartItemRequest {

    @NotNull(message = "variantId is required")
    private UUID variantId;

    @Positive(message = "quantity must be greater than zero")
    private Integer quantity = 1;
}


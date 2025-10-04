package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class ProductVariantUnavailableException extends ApiException {

    public ProductVariantUnavailableException(UUID variantId) {
        super("Product variant is not available for purchase: " + variantId, HttpStatus.BAD_REQUEST.value());
    }

    public ProductVariantUnavailableException(UUID variantId, String reason) {
        super("Product variant " + variantId + " is not available: " + reason, HttpStatus.BAD_REQUEST.value());
    }
}


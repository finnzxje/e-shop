package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class ProductVariantNotFoundException extends ApiException {

    public ProductVariantNotFoundException(UUID variantId) {
        super("Product variant not found: " + variantId, HttpStatus.NOT_FOUND.value());
    }

    public ProductVariantNotFoundException(String variantSku) {
        super("Product variant not found with SKU: " + variantSku, HttpStatus.NOT_FOUND.value());
    }
}


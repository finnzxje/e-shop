package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class ProductVariantInUseException extends ApiException {

    public ProductVariantInUseException(UUID variantId) {
        super("Product variant " + variantId + " is referenced by existing orders and cannot be deleted", HttpStatus.CONFLICT.value());
    }
}

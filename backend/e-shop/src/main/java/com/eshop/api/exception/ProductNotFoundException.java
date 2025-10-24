package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class ProductNotFoundException extends ApiException {

    public ProductNotFoundException(String slug) {
        super("Product not found: " + slug, HttpStatus.NOT_FOUND.value());
    }

    public ProductNotFoundException(java.util.UUID productId) {
        super("Product not found with id: " + productId, HttpStatus.NOT_FOUND.value());
    }
}

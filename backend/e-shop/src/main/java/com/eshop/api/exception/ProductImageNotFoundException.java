package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class ProductImageNotFoundException extends ApiException {

    public ProductImageNotFoundException(UUID imageId) {
        super("Product image not found with id: " + imageId, HttpStatus.NOT_FOUND.value());
    }
}

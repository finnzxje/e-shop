package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class CartNotFoundException extends ApiException {

    public CartNotFoundException(UUID userId) {
        super("Cart not found for user: " + userId, HttpStatus.NOT_FOUND.value());
    }

    public CartNotFoundException() {
        super("Cart not found", HttpStatus.NOT_FOUND.value());
    }
}


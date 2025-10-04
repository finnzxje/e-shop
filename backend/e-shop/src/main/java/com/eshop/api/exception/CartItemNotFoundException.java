package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class CartItemNotFoundException extends ApiException {

    public CartItemNotFoundException(UUID itemId) {
        super("Cart item not found: " + itemId, HttpStatus.NOT_FOUND.value());
    }
}


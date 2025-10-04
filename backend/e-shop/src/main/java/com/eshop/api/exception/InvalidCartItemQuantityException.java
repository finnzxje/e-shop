package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidCartItemQuantityException extends ApiException {

    public InvalidCartItemQuantityException() {
        super("Cart item quantity must be greater than zero", HttpStatus.BAD_REQUEST.value());
    }
}


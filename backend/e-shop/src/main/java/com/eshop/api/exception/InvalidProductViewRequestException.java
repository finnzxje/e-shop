package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidProductViewRequestException extends ApiException {

    public InvalidProductViewRequestException() {
        super("Either an authenticated user or a sessionId must be provided to record a product view", HttpStatus.BAD_REQUEST.value());
    }
}

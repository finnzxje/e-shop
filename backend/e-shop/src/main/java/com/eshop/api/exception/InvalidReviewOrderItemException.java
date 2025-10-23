package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidReviewOrderItemException extends ApiException {

    public InvalidReviewOrderItemException(String message) {
        super(message, HttpStatus.BAD_REQUEST.value());
    }
}


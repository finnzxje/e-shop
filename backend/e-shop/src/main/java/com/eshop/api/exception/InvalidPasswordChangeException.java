package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidPasswordChangeException extends ApiException {

    public InvalidPasswordChangeException(String message) {
        super(message, HttpStatus.BAD_REQUEST.value());
    }
}

package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidPasswordResetTokenException extends ApiException {

    public InvalidPasswordResetTokenException(String message) {
        super(message, HttpStatus.BAD_REQUEST.value());
    }
}

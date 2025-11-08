package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidImageUploadException extends ApiException {

    public InvalidImageUploadException(String message) {
        super(message, HttpStatus.BAD_REQUEST.value());
    }
}

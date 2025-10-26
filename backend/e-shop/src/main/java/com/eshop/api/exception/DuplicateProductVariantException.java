package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class DuplicateProductVariantException extends ApiException {

    public DuplicateProductVariantException(String message) {
        super(message, HttpStatus.CONFLICT.value());
    }
}

package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidSearchQueryException extends ApiException {

    public InvalidSearchQueryException(String query) {
        super("Invalid search query: " + query, HttpStatus.BAD_REQUEST.value());
    }
}

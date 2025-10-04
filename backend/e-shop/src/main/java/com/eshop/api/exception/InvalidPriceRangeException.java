package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidPriceRangeException extends ApiException {

    public InvalidPriceRangeException() {
        super("priceMin cannot be greater than priceMax", HttpStatus.BAD_REQUEST.value());
    }
}

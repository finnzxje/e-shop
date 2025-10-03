package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidGenderException extends ApiException {

    public InvalidGenderException(String gender) {
        super("Unsupported gender value: " + gender, HttpStatus.BAD_REQUEST.value());
    }
}

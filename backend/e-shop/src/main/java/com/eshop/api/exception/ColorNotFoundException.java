package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class ColorNotFoundException extends ApiException {

    public ColorNotFoundException(Integer colorId) {
        super("Color not found with id: " + colorId, HttpStatus.NOT_FOUND.value());
    }
}

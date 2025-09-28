package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class CategoryAlreadyExistsException extends ApiException {

    public CategoryAlreadyExistsException(String slug) {
        super("Category already exists with slug: " + slug, HttpStatus.CONFLICT.value());
    }
}

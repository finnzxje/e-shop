package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class ProductSlugAlreadyExistsException extends ApiException {

    public ProductSlugAlreadyExistsException(String slug) {
        super("Product already exists with slug: " + slug, HttpStatus.CONFLICT.value());
    }
}

package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class CategoryNotFoundException extends ApiException {

    public CategoryNotFoundException(String slug) {
        super("Category not found: " + slug, HttpStatus.NOT_FOUND.value());
    }

    public CategoryNotFoundException(Integer id) {
        super("Category not found with id: " + id, HttpStatus.NOT_FOUND.value());
    }
}

package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class DuplicateProductReviewException extends ApiException {

    public DuplicateProductReviewException() {
        super("You have already submitted a review for this product", HttpStatus.CONFLICT.value());
    }
}


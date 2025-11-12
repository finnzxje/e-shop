package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidRecommendationRequestException extends ApiException {

    public InvalidRecommendationRequestException(String message) {
        super(message, HttpStatus.BAD_REQUEST.value());
    }
}

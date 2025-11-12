package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class RecommendationServiceUnavailableException extends ApiException {

    public RecommendationServiceUnavailableException(String message, Throwable cause) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE.value(), cause);
    }

    public RecommendationServiceUnavailableException(String message) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE.value());
    }
}

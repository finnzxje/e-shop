package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidAnalyticsPeriodException extends ApiException {

    public InvalidAnalyticsPeriodException(String period) {
        super("Unsupported analytics period: " + period, HttpStatus.BAD_REQUEST.value());
    }
}

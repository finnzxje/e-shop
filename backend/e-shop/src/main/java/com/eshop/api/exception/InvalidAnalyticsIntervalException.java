package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidAnalyticsIntervalException extends ApiException {

    public InvalidAnalyticsIntervalException(String interval) {
        super("Unsupported analytics interval: " + interval, HttpStatus.BAD_REQUEST.value());
    }
}

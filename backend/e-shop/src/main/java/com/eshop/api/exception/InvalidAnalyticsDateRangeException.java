package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class InvalidAnalyticsDateRangeException extends ApiException {

    public InvalidAnalyticsDateRangeException() {
        super("Analytics start must be before end, and both must be provided", HttpStatus.BAD_REQUEST.value());
    }
}

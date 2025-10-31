package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class SupportMessageForbiddenException extends ApiException {

    public SupportMessageForbiddenException() {
        super("You are not allowed to perform this support action", HttpStatus.FORBIDDEN.value());
    }
}

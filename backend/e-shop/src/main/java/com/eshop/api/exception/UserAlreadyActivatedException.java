package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class UserAlreadyActivatedException extends ApiException {

    public UserAlreadyActivatedException(String email) {
        super("User account is already activated: " + email, HttpStatus.CONFLICT.value());
    }
}

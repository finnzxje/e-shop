package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

public class AccountNotActivatedException extends ApiException {

    public AccountNotActivatedException(String email) {
        super("Account is not activated. Please verify your email: " + email, HttpStatus.FORBIDDEN.value());
    }
}

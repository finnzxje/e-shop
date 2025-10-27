package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class UserNotFoundException extends ApiException {

    public UserNotFoundException(UUID userId) {
        super("User not found: " + userId, HttpStatus.NOT_FOUND.value());
    }
}

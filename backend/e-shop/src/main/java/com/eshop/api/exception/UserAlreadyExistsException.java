package com.eshop.api.exception;

public class UserAlreadyExistsException extends RuntimeException {
    public UserAlreadyExistsException(String message) {
        super(message);
    }
    
    public UserAlreadyExistsException(String message, Throwable cause) {
        super(message, cause);
    }
}
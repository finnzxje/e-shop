package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class InsufficientInventoryException extends ApiException {

    public InsufficientInventoryException(UUID variantId, int requested, int available) {
        super("Requested quantity " + requested + " exceeds available stock " + available + " for variant: " + variantId,
            HttpStatus.BAD_REQUEST.value());
    }
}


package com.eshop.api.order.exception;

import com.eshop.api.exception.ApiException;

public class CheckoutValidationException extends ApiException {

    public CheckoutValidationException(String message) {
        super(message, 400);
    }
}

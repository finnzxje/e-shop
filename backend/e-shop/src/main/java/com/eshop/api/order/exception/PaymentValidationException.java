package com.eshop.api.order.exception;

import com.eshop.api.exception.ApiException;

public class PaymentValidationException extends ApiException {
    public PaymentValidationException(String message) {
        super(message, 400);
    }
}

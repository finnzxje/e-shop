package com.eshop.api.order.exception;

import com.eshop.api.exception.ApiException;

public class PaymentInitializationException extends ApiException {

    public PaymentInitializationException(String message) {
        super(message, 502);
    }

    public PaymentInitializationException(String message, Throwable cause) {
        super(message, 502, cause);
    }
}

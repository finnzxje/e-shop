package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class PaymentTransactionNotFoundException extends ApiException {

    public PaymentTransactionNotFoundException(UUID transactionId) {
        super("Payment transaction not found: " + transactionId, HttpStatus.NOT_FOUND.value());
    }
}

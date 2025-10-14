package com.eshop.api.order.exception;

import com.eshop.api.exception.ApiException;

public class CartEmptyException extends ApiException {

    public CartEmptyException() {
        super("Cannot checkout with an empty cart", 400);
    }
}

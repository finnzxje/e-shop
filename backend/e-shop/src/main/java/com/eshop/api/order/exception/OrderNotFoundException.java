package com.eshop.api.order.exception;

import com.eshop.api.exception.ApiException;

import java.util.UUID;

public class OrderNotFoundException extends ApiException {

    public OrderNotFoundException(UUID orderId) {
        super("Order not found: " + orderId, 404);
    }
}

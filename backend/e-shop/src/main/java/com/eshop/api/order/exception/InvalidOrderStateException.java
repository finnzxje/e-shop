package com.eshop.api.order.exception;

import com.eshop.api.exception.ApiException;
import com.eshop.api.order.enums.OrderStatus;

public class InvalidOrderStateException extends ApiException {

    public InvalidOrderStateException(OrderStatus currentStatus, String action) {
        super("Order status " + currentStatus + " cannot be " + action, 409);
    }
}

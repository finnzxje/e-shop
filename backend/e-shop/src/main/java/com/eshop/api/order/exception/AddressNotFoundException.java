package com.eshop.api.order.exception;

import com.eshop.api.exception.ApiException;

import java.util.UUID;

public class AddressNotFoundException extends ApiException {

    public AddressNotFoundException(UUID addressId) {
        super("Address not found for id: " + addressId, 404);
    }
}

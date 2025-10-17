package com.eshop.api.wishlist.exception;

import com.eshop.api.exception.ApiException;

import java.util.UUID;

public class WishlistItemNotFoundException extends ApiException {

    public WishlistItemNotFoundException(UUID productId) {
        super("Wishlist does not contain product: " + productId, 404);
    }
}

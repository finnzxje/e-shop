package com.eshop.api.order.service;

import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.cart.model.Cart;
import com.eshop.api.cart.model.CartItem;
import com.eshop.api.cart.repository.CartRepository;
import com.eshop.api.catalog.repository.ProductVariantRepository;
import com.eshop.api.exception.InsufficientInventoryException;
import com.eshop.api.exception.ProductVariantNotFoundException;
import com.eshop.api.order.model.OrderItem;
import java.util.ArrayList;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final ProductVariantRepository productVariantRepository;
    private final CartRepository cartRepository;

    @Transactional
    public void reserveCartItems(Collection<CartItem> cartItems) {
        if (cartItems == null || cartItems.isEmpty()) {
            return;
        }
        for (CartItem cartItem : cartItems) {
            ProductVariant variant = resolveVariant(cartItem.getVariant() != null ? cartItem.getVariant().getId() : null);
            int requested = Objects.requireNonNullElse(cartItem.getQuantity(), 0);
            if (requested <= 0) {
                throw new IllegalArgumentException("Cart item quantity must be positive when reserving inventory");
            }
            int available = Objects.requireNonNullElse(variant.getQuantityInStock(), 0);
            if (available < requested) {
                throw new InsufficientInventoryException(variant.getId(), requested, available);
            }
            variant.setQuantityInStock(available - requested);
        }
    }

    @Transactional
    public void releaseOrderItems(Collection<OrderItem> orderItems) {
        if (orderItems == null || orderItems.isEmpty()) {
            return;
        }
        for (OrderItem orderItem : orderItems) {
            ProductVariant variant = resolveVariant(orderItem.getVariant() != null ? orderItem.getVariant().getId() : null);
            int quantity = Objects.requireNonNullElse(orderItem.getQuantity(), 0);
            if (quantity <= 0) {
                continue;
            }
            int available = Objects.requireNonNullElse(variant.getQuantityInStock(), 0);
            variant.setQuantityInStock(available + quantity);
        }
    }

    @Transactional
    public void clearCart(Cart cart) {
        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            return;
        }
        ArrayList<CartItem> items = new ArrayList<>(cart.getItems());
        for (CartItem item : items) {
            cart.removeItem(item);
        }
        cartRepository.save(cart);
    }

    private ProductVariant resolveVariant(UUID variantId) {
        if (variantId == null) {
            throw new ProductVariantNotFoundException((UUID) null);
        }
        return productVariantRepository.findById(variantId)
            .orElseThrow(() -> new ProductVariantNotFoundException(variantId));
    }
}

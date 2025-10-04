package com.eshop.api.cart.repository;

import com.eshop.api.cart.model.CartItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    @EntityGraph(attributePaths = {
        "variant",
        "variant.product",
        "variant.product.category",
        "variant.color"
    })
    Optional<CartItem> findByIdAndCart_User_Id(UUID id, UUID userId);

    Optional<CartItem> findByCart_IdAndVariant_Id(UUID cartId, UUID variantId);
}


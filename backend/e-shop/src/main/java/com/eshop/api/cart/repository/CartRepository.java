package com.eshop.api.cart.repository;

import com.eshop.api.cart.model.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CartRepository extends JpaRepository<Cart, UUID> {

    @EntityGraph(attributePaths = {
        "items",
        "items.variant",
        "items.variant.product",
        "items.variant.product.images",
        "items.variant.product.category",
        "items.variant.color"
    })
    Optional<Cart> findByUser_Id(UUID userId);

    boolean existsByUser_Id(UUID userId);
}

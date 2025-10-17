package com.eshop.api.wishlist.repository;

import com.eshop.api.wishlist.model.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WishlistItemRepository extends JpaRepository<WishlistItem, UUID> {

    List<WishlistItem> findByUser_IdOrderByAddedAtDesc(UUID userId);

    Optional<WishlistItem> findByUser_IdAndProduct_Id(UUID userId, UUID productId);

    boolean existsByUser_IdAndProduct_Id(UUID userId, UUID productId);

    void deleteByUser_IdAndProduct_Id(UUID userId, UUID productId);
}

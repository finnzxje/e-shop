package com.eshop.api.wishlist.service;

import com.eshop.api.catalog.enums.ProductStatus;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.repository.ProductRepository;
import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.exception.ProductNotFoundException;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import com.eshop.api.wishlist.dto.WishlistItemRequest;
import com.eshop.api.wishlist.dto.WishlistItemResponse;
import com.eshop.api.wishlist.exception.WishlistItemNotFoundException;
import com.eshop.api.wishlist.model.WishlistItem;
import com.eshop.api.wishlist.repository.WishlistItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class WishlistService {

    private final WishlistItemRepository wishlistItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<WishlistItemResponse> listItems(String email) {
        User user = resolveUser(email);
        return wishlistItemRepository.findByUser_IdOrderByAddedAtDesc(user.getId()).stream()
            .map(this::toResponse)
            .toList();
    }

    public WishlistItemResponse addItem(String email, WishlistItemRequest request) {
        User user = resolveUser(email);
        Product product = productRepository.findById(request.productId())
            .orElseThrow(() -> new ProductNotFoundException(request.productId().toString()));

        WishlistItem item = wishlistItemRepository.findByUser_IdAndProduct_Id(user.getId(), product.getId())
            .orElseGet(() -> WishlistItem.builder()
                .user(user)
                .product(product)
                .build());

        WishlistItem saved = wishlistItemRepository.save(item);

        log.info("Wishlist item {} ensured for user {}", saved.getId(), user.getId());
        return toResponse(saved);
    }

    public void removeItem(String email, UUID productId) {
        User user = resolveUser(email);
        WishlistItem item = wishlistItemRepository.findByUser_IdAndProduct_Id(user.getId(), productId)
            .orElseThrow(() -> new WishlistItemNotFoundException(productId));
        wishlistItemRepository.delete(item);
        log.info("Removed product {} from wishlist for user {}", productId, user.getId());
    }

    private WishlistItemResponse toResponse(WishlistItem item) {
        Product product = item.getProduct();
        Boolean active = product.getStatus() != null ? product.getStatus() == ProductStatus.ACTIVE : null;
        return new WishlistItemResponse(
            item.getId(),
            product.getId(),
            product.getName(),
            product.getSlug(),
            product.getBasePrice(),
            active,
            item.getAddedAt()
        );
    }

    private User resolveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new InvalidJwtException("Authentication is required for wishlist operations");
        }
        return userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }
}

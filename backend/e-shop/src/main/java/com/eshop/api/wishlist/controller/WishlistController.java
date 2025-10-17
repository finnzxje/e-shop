package com.eshop.api.wishlist.controller;

import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.wishlist.dto.WishlistItemRequest;
import com.eshop.api.wishlist.dto.WishlistItemResponse;
import com.eshop.api.wishlist.service.WishlistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/account/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<List<WishlistItemResponse>> listWishlist(Authentication authentication) {
        String email = resolveEmail(authentication);
        return ResponseEntity.ok(wishlistService.listItems(email));
    }

    @PostMapping
    public ResponseEntity<WishlistItemResponse> addToWishlist(
        @Valid @RequestBody WishlistItemRequest request,
        Authentication authentication
    ) {
        String email = resolveEmail(authentication);
        WishlistItemResponse response = wishlistService.addItem(email, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeFromWishlist(
        @PathVariable("productId") UUID productId,
        Authentication authentication
    ) {
        String email = resolveEmail(authentication);
        wishlistService.removeItem(email, productId);
        return ResponseEntity.noContent().build();
    }

    private String resolveEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidJwtException("Authentication is required for wishlist operations");
        }
        return authentication.getName();
    }
}

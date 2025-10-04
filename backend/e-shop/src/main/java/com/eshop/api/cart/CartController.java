package com.eshop.api.cart;

import com.eshop.api.cart.dto.AddCartItemRequest;
import com.eshop.api.cart.dto.CartResponse;
import com.eshop.api.cart.dto.UpdateCartItemRequest;
import com.eshop.api.cart.service.CartService;
import com.eshop.api.exception.InvalidJwtException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getCart(Authentication authentication) {
        String email = resolveEmail(authentication);
        CartResponse response = cartService.getCart(email);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(
        Authentication authentication,
        @Valid @RequestBody AddCartItemRequest request
    ) {
        String email = resolveEmail(authentication);
        CartResponse response = cartService.addItem(email, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> updateItem(
        Authentication authentication,
        @PathVariable("itemId") UUID itemId,
        @Valid @RequestBody UpdateCartItemRequest request
    ) {
        String email = resolveEmail(authentication);
        CartResponse response = cartService.updateItem(email, itemId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> removeItem(
        Authentication authentication,
        @PathVariable("itemId") UUID itemId
    ) {
        String email = resolveEmail(authentication);
        CartResponse response = cartService.removeItem(email, itemId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping
    public ResponseEntity<CartResponse> clearCart(Authentication authentication) {
        String email = resolveEmail(authentication);
        CartResponse response = cartService.clearCart(email);
        return ResponseEntity.ok(response);
    }

    private String resolveEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidJwtException("Authentication is required to access the cart");
        }
        return authentication.getName();
    }
}


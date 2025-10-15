package com.eshop.api.order.controller;

import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.order.dto.CheckoutRequest;
import com.eshop.api.order.dto.CheckoutResponse;
import com.eshop.api.order.service.OrderCheckoutService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderCheckoutService orderCheckoutService;

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(
        Authentication authentication,
        @Valid @RequestBody CheckoutRequest request,
        HttpServletRequest httpServletRequest
    ) {
        String email = resolveEmail(authentication);
        String clientIp = resolveClientIp(httpServletRequest);
        CheckoutResponse response = orderCheckoutService.checkout(email, request, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private String resolveEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidJwtException("Authentication is required to place an order");
        }
        return authentication.getName();
    }

    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "0.0.0.0";
        }
        String header = request.getHeader("X-Forwarded-For");
        if (header != null && !header.isBlank()) {
            return header.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

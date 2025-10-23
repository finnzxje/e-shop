package com.eshop.api.order.controller;

import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.order.dto.CheckoutRequest;
import com.eshop.api.order.dto.CheckoutResponse;
import com.eshop.api.order.dto.OrderStatusResponse;
import com.eshop.api.order.dto.PurchasedItemLookupResponse;
import com.eshop.api.order.dto.PurchasedItemResponse;
import com.eshop.api.order.dto.OrderSummaryResponse;
import com.eshop.api.order.service.OrderCheckoutService;
import com.eshop.api.order.service.OrderHistoryService;
import com.eshop.api.order.service.OrderLifecycleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderCheckoutService orderCheckoutService;
    private final OrderHistoryService orderHistoryService;
    private final OrderLifecycleService orderLifecycleService;

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

    @GetMapping("/purchased-items")
    public ResponseEntity<PageResponse<PurchasedItemResponse>> getPurchasedItems(
        Authentication authentication,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        String email = resolveEmail(authentication);
        PageResponse<PurchasedItemResponse> response = orderHistoryService.getPurchasedItems(email, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<OrderSummaryResponse>> listOrders(
        Authentication authentication,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        String email = resolveEmail(authentication);
        PageResponse<OrderSummaryResponse> response = orderHistoryService.getOrderSummaries(email, pageable);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{orderId}/confirm-fulfillment")
    public ResponseEntity<OrderStatusResponse> confirmFulfillment(
        Authentication authentication,
        @PathVariable("orderId") UUID orderId
    ) {
        String email = resolveEmail(authentication);
        OrderStatusResponse response = orderLifecycleService.confirmFulfillment(email, orderId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/purchased-items/{productId}/latest")
    public ResponseEntity<PurchasedItemLookupResponse> getLatestPurchasedItem(
        Authentication authentication,
        @PathVariable("productId") UUID productId
    ) {
        String email = resolveEmail(authentication);
        return orderHistoryService.findLatestPurchasedItem(email, productId)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
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

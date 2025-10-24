package com.eshop.api.order.service;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.order.dto.PurchasedItemLookupResponse;
import com.eshop.api.order.dto.OrderSummaryItemResponse;
import com.eshop.api.order.dto.OrderSummaryResponse;
import com.eshop.api.order.dto.PurchasedItemResponse;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.model.Order;
import com.eshop.api.order.model.OrderItem;
import com.eshop.api.order.repository.OrderItemRepository;
import com.eshop.api.order.repository.OrderRepository;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderHistoryService {

    private final OrderItemRepository orderItemRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<PurchasedItemResponse> getPurchasedItems(String email, Pageable pageable) {
        User user = resolveUser(email);
        Page<OrderItem> page = orderItemRepository.findPurchasedItemsByUser(user.getId(), PaymentStatus.CAPTURED, pageable);

        return PageResponse.<PurchasedItemResponse>builder()
            .content(page.stream().map(this::toResponse).toList())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .page(page.getNumber())
            .size(page.getSize())
            .hasNext(page.hasNext())
            .hasPrevious(page.hasPrevious())
            .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> getOrderSummaries(String email, Pageable pageable) {
        User user = resolveUser(email);
        var page = orderRepository.findByUser_IdOrderByPlacedAtDesc(user.getId(), pageable);

        return PageResponse.<OrderSummaryResponse>builder()
            .content(page.stream().map(this::toSummaryResponse).toList())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .page(page.getNumber())
            .size(page.getSize())
            .hasNext(page.hasNext())
            .hasPrevious(page.hasPrevious())
            .build();
    }

    @Transactional(readOnly = true)
    public Optional<PurchasedItemLookupResponse> findLatestPurchasedItem(String email, UUID productId) {
        User user = resolveUser(email);
        Optional<OrderItem> optionalOrderItem = orderItemRepository.findLatestPurchasedItemByUserAndProduct(
            user.getId(),
            productId,
            PaymentStatus.CAPTURED
        );

        return optionalOrderItem.map(item -> {
            var order = item.getOrder();
            Instant purchasedAt = null;
            boolean verifiedPurchase = false;

            if (order != null) {
                purchasedAt = order.getPaidAt() != null ? order.getPaidAt() : order.getPlacedAt();
                verifiedPurchase = order.getPaymentStatus() == PaymentStatus.CAPTURED;
            }

            return new PurchasedItemLookupResponse(
                item.getId(),
                order != null ? order.getId() : null,
                order != null ? order.getOrderNumber() : null,
                purchasedAt != null ? purchasedAt : item.getCreatedAt(),
                verifiedPurchase
            );
        });
    }

    private PurchasedItemResponse toResponse(OrderItem item) {
        var order = item.getOrder();
        var product = item.getProduct();
        var variant = item.getVariant();
        var slug = product.getSlug();

        return PurchasedItemResponse.builder()
            .orderId(order != null ? order.getId() : null)
            .orderNumber(order != null ? order.getOrderNumber() : null)
            .orderStatus(order != null ? order.getStatus() : null)
            .paymentStatus(order != null ? order.getPaymentStatus() : null)
            .orderItemId(item.getId())
            .productId(product != null ? product.getId() : null)
            .productName(product != null ? product.getName() : null)
            .slug(slug)
            .variantId(variant != null ? variant.getId() : null)
            .quantity(item.getQuantity())
            .unitPrice(item.getUnitPrice())
            .totalAmount(item.getTotalAmount())
            .currency(item.getCurrency())
            .purchasedAt(order != null ? (order.getPaidAt() != null ? order.getPaidAt() : order.getPlacedAt()) : item.getCreatedAt())
            .build();
    }

    private User resolveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new InvalidJwtException("Authentication is required to access order history");
        }
        return userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found for email: " + email));
    }

    private OrderSummaryResponse toSummaryResponse(Order order) {
        var items = order.getItems().stream()
            .map(item -> {
                var product = item.getProduct();
                var variant = item.getVariant();
                return OrderSummaryItemResponse.builder()
                    .orderItemId(item.getId())
                    .productId(product != null ? product.getId() : null)
                    .productName(product != null ? product.getName() : null)
                    .variantId(variant != null ? variant.getId() : null)
                    .quantity(item.getQuantity())
                    .slug(product != null ? product.getSlug() : null)
                    .unitPrice(item.getUnitPrice())
                    .totalAmount(item.getTotalAmount())
                    .currency(item.getCurrency())
                    .build();
            })
            .toList();

        return OrderSummaryResponse.builder()
            .orderId(order.getId())
            .orderNumber(order.getOrderNumber())
            .orderStatus(order.getStatus())
            .paymentStatus(order.getPaymentStatus())
            .subtotalAmount(order.getSubtotalAmount())
            .discountAmount(order.getDiscountAmount())
            .shippingAmount(order.getShippingAmount())
            .taxAmount(order.getTaxAmount())
            .totalAmount(order.getTotalAmount())
            .currency(order.getCurrency())
            .shippingMethod(order.getShippingMethod())
            .shippingTrackingNumber(order.getShippingTrackingNumber())
            .placedAt(order.getPlacedAt())
            .paidAt(order.getPaidAt())
            .fulfilledAt(order.getFulfilledAt())
            .items(items)
            .build();
    }
}

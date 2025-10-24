package com.eshop.api.catalog.service;

import com.eshop.api.analytics.enums.InteractionType;
import com.eshop.api.analytics.service.ProductInteractionEventService;
import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductReview;
import com.eshop.api.catalog.repository.ProductRepository;
import com.eshop.api.catalog.repository.ProductReviewRepository;
import com.eshop.api.catalog.review.dto.ProductReviewRequest;
import com.eshop.api.catalog.review.dto.ProductReviewResponse;
import com.eshop.api.exception.DuplicateProductReviewException;
import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.exception.InvalidReviewOrderItemException;
import com.eshop.api.exception.ProductNotFoundException;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.model.OrderItem;
import com.eshop.api.order.repository.OrderItemRepository;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ProductReviewService {

    private final ProductReviewRepository productReviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductInteractionEventService interactionEventService;

    @Transactional(readOnly = true)
    public PageResponse<ProductReviewResponse> listReviews(UUID productId, Pageable pageable) {
        Product product = resolveProduct(productId);
        Page<ProductReview> page = productReviewRepository.findByProduct_Id(product.getId(), pageable);

        List<ProductReviewResponse> content = page.stream()
            .map(this::toResponse)
            .toList();

        return PageResponse.<ProductReviewResponse>builder()
            .content(content)
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .page(page.getNumber())
            .size(page.getSize())
            .hasNext(page.hasNext())
            .hasPrevious(page.hasPrevious())
            .build();
    }

    public ProductReviewResponse createReview(UUID productId, String email, ProductReviewRequest request) {
        User user = resolveUser(email);
        Product product = resolveProduct(productId);

        productReviewRepository.findByProduct_IdAndUser_Id(product.getId(), user.getId())
            .ifPresent(existing -> {
                throw new DuplicateProductReviewException();
            });

        OrderItem orderItem = null;
        boolean verifiedPurchase = false;
        if (request.orderItemId() != null) {
            orderItem = orderItemRepository.findById(request.orderItemId())
                .orElseThrow(() -> new InvalidReviewOrderItemException("Order item not found for verification"));

            if (orderItem.getOrder() == null || orderItem.getOrder().getUser() == null) {
                throw new InvalidReviewOrderItemException("Order item cannot be verified for the current user");
            }

            if (!user.getId().equals(orderItem.getOrder().getUser().getId())) {
                throw new InvalidReviewOrderItemException("Order item does not belong to the current user");
            }

            if (orderItem.getProduct() == null || !orderItem.getProduct().getId().equals(product.getId())) {
                throw new InvalidReviewOrderItemException("Order item does not match the reviewed product");
            }

            verifiedPurchase = orderItem.getOrder().getPaymentStatus() == PaymentStatus.CAPTURED;
        }

        ProductReview review = ProductReview.builder()
            .product(product)
            .user(user)
            .orderItem(orderItem)
            .rating(request.rating())
            .reviewText(request.reviewText().trim())
            .verifiedPurchase(verifiedPurchase)
            .build();

        ProductReview saved = productReviewRepository.save(review);
        interactionEventService.recordInteraction(user, product, InteractionType.RATING, metadata ->
            metadata.put("rating_value", saved.getRating())
        );
        log.info("Created review {} for product {} by user {}", saved.getId(), product.getId(), user.getId());
        return toResponse(saved);
    }

    private Product resolveProduct(UUID productId) {
        return productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId.toString()));
    }

    private User resolveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new InvalidJwtException("Authentication is required to review products");
        }

        return userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    private ProductReviewResponse toResponse(ProductReview review) {
        User user = review.getUser();
        return new ProductReviewResponse(
            review.getId(),
            review.getProduct() != null ? review.getProduct().getId() : null,
            user != null ? user.getId() : null,
            user != null ? buildDisplayName(user) : null,
            review.getRating() != null ? review.getRating() : 0,
            review.getReviewText(),
            Boolean.TRUE.equals(review.getVerifiedPurchase()),
            review.getCreatedAt(),
            review.getUpdatedAt()
        );
    }

    private String buildDisplayName(User user) {
        String email = user.getEmail();
        String display = Stream.of(user.getFirstName(), user.getLastName())
            .filter(value -> value != null && !value.isBlank())
            .collect(Collectors.joining(" "));
        if (display.isBlank()) {
            return email;
        }
        return display;
    }
}

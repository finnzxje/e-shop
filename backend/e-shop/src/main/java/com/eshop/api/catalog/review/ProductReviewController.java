package com.eshop.api.catalog.review;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.catalog.review.dto.ProductReviewRequest;
import com.eshop.api.catalog.review.dto.ProductReviewResponse;
import com.eshop.api.catalog.service.ProductReviewService;
import com.eshop.api.exception.InvalidJwtException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/products/{productId}/reviews")
@RequiredArgsConstructor
public class ProductReviewController {

    private final ProductReviewService productReviewService;

    @GetMapping
    public ResponseEntity<PageResponse<ProductReviewResponse>> listReviews(
        @PathVariable UUID productId,
        @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PageResponse<ProductReviewResponse> response = productReviewService.listReviews(productId, pageable);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<ProductReviewResponse> createReview(
        @PathVariable UUID productId,
        @Valid @RequestBody ProductReviewRequest request,
        Authentication authentication
    ) {
        String email = resolveEmail(authentication);
        ProductReviewResponse response = productReviewService.createReview(productId, email, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    private String resolveEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidJwtException("Authentication is required to submit product reviews");
        }
        return authentication.getName();
    }
}


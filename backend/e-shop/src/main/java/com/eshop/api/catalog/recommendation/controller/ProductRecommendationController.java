package com.eshop.api.catalog.recommendation.controller;

import com.eshop.api.catalog.recommendation.dto.ProductRecommendationResponse;
import com.eshop.api.catalog.recommendation.service.ProductRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/products")
@RequiredArgsConstructor
public class ProductRecommendationController {

    private final ProductRecommendationService productRecommendationService;

    @GetMapping("/variants/{variantId}/recommendations")
    public ResponseEntity<ProductRecommendationResponse> recommendSimilarProducts(
        @PathVariable UUID variantId,
        @RequestParam(value = "k", required = false) Integer limit
    ) {
        ProductRecommendationResponse response = productRecommendationService.getRecommendations(variantId, limit);
        return ResponseEntity.ok(response);
    }
}

package com.eshop.api.catalog.recommendation.service;

import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductImage;
import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.catalog.recommendation.client.RecommendationClient;
import com.eshop.api.catalog.recommendation.dto.ModelRecommendationItem;
import com.eshop.api.catalog.recommendation.dto.ModelRecommendationResponse;
import com.eshop.api.catalog.recommendation.dto.ProductRecommendationItem;
import com.eshop.api.catalog.recommendation.dto.ProductRecommendationResponse;
import com.eshop.api.catalog.repository.ProductImageRepository;
import com.eshop.api.catalog.repository.ProductVariantRepository;
import com.eshop.api.exception.InvalidRecommendationRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductRecommendationService {

    private static final int DEFAULT_LIMIT = 5;
    private static final int MAX_LIMIT = 20;

    private final RecommendationClient recommendationClient;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;

    public ProductRecommendationResponse getRecommendations(UUID variantId, Integer limit) {
        int resolvedLimit = resolveLimit(limit);
        ModelRecommendationResponse modelResponse = recommendationClient.fetchRecommendations(variantId, resolvedLimit);

        List<ModelRecommendationItem> modelItems = modelResponse.getRecommendations();
        if (CollectionUtils.isEmpty(modelItems)) {
            return buildResponse(modelResponse.getQueryVariantId() != null ? modelResponse.getQueryVariantId() : variantId,
                List.of(),
                modelResponse);
        }

        LinkedHashMap<UUID, ModelRecommendationItem> orderedVariants = new LinkedHashMap<>();
        for (ModelRecommendationItem item : modelItems) {
            if (item.getVariantId() != null) {
                orderedVariants.putIfAbsent(item.getVariantId(), item);
            }
        }

        if (orderedVariants.isEmpty()) {
            return buildResponse(modelResponse.getQueryVariantId() != null ? modelResponse.getQueryVariantId() : variantId,
                List.of(),
                modelResponse);
        }

        List<UUID> variantIds = new ArrayList<>(orderedVariants.keySet());
        Map<UUID, ProductVariant> variantMap = productVariantRepository.findByIdIn(variantIds).stream()
            .collect(Collectors.toMap(ProductVariant::getId, variant -> variant, (existing, duplicate) -> existing, HashMap::new));

        List<ProductRecommendationItem> recommendations = new ArrayList<>();
        Set<UUID> seenProductIds = new HashSet<>();

        for (UUID recommendedVariantId : orderedVariants.keySet()) {
            ProductVariant productVariant = variantMap.get(recommendedVariantId);
            if (productVariant == null) {
                continue;
            }

            Product product = productVariant.getProduct();
            if (product == null || product.getId() == null) {
                continue;
            }

            if (!seenProductIds.add(product.getId())) {
                continue;
            }

            String imageUrl = resolvePrimaryImage(product.getId());
            ModelRecommendationItem modelItem = orderedVariants.get(recommendedVariantId);

            ProductRecommendationItem responseItem = ProductRecommendationItem.builder()
                .productId(product.getId())
                .variantId(productVariant.getId())
                .productName(product.getName())
                .productSlug(product.getSlug())
                .price(resolvePrice(productVariant, product))
                .similarityScore(modelItem != null ? modelItem.getSimilarityScore() : null)
                .imageUrl(imageUrl)
                .build();

            recommendations.add(responseItem);
            if (recommendations.size() >= resolvedLimit) {
                break;
            }
        }

        return buildResponse(
            modelResponse.getQueryVariantId() != null ? modelResponse.getQueryVariantId() : variantId,
            recommendations,
            modelResponse
        );
    }

    private ProductRecommendationResponse buildResponse(
        UUID queryVariantId,
        List<ProductRecommendationItem> recommendations,
        ModelRecommendationResponse modelResponse
    ) {
        return ProductRecommendationResponse.builder()
            .queryVariantId(queryVariantId)
            .recommendations(List.copyOf(recommendations))
            .fromCache(Boolean.TRUE.equals(modelResponse.getFromCache()))
            .responseTimeMs(modelResponse.getResponseTimeMs())
            .totalResults(recommendations.size())
            .build();
    }

    private int resolveLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }

        if (limit <= 0 || limit > MAX_LIMIT) {
            throw new InvalidRecommendationRequestException(
                "Parameter 'k' must be between 1 and " + MAX_LIMIT);
        }

        return limit;
    }

    private BigDecimal resolvePrice(ProductVariant variant, Product product) {
        if (variant.getPrice() != null) {
            return variant.getPrice();
        }
        if (product.getBasePrice() != null) {
            return product.getBasePrice();
        }
        return BigDecimal.ZERO;
    }

    private String resolvePrimaryImage(UUID productId) {
        List<ProductImage> images = productImageRepository.findByProductIdOrderByDisplayOrder(productId);
        if (CollectionUtils.isEmpty(images)) {
            return null;
        }

        return images.stream()
            .filter(image -> Boolean.TRUE.equals(image.getPrimary()))
            .findFirst()
            .orElse(images.get(0))
            .getImageUrl();
    }
}

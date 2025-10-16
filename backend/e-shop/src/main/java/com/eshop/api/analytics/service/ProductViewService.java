package com.eshop.api.analytics.service;

import com.eshop.api.analytics.dto.ProductViewRequest;
import com.eshop.api.analytics.model.ProductView;
import com.eshop.api.analytics.repository.ProductViewRepository;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.catalog.repository.ProductRepository;
import com.eshop.api.catalog.repository.ProductVariantRepository;
import com.eshop.api.exception.InvalidProductViewRequestException;
import com.eshop.api.exception.ProductNotFoundException;
import com.eshop.api.exception.ProductVariantNotFoundException;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductViewService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductViewRepository productViewRepository;
    private final UserRepository userRepository;

    @Transactional
    public UUID recordProductView(UUID productId, ProductViewRequest request, String authenticatedEmail) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId.toString()));

        ProductVariant variant = resolveVariant(product, request.variantId());
        User user = resolveUser(authenticatedEmail);

        if (user == null && request.sessionId() == null) {
            throw new InvalidProductViewRequestException();
        }

        JsonNode metadata = request.metadataOrEmpty();

        ProductView view = ProductView.builder()
            .product(product)
            .variant(variant)
            .user(user)
            .sessionId(request.sessionId())
            .metadata(metadata)
            .build();

        ProductView persisted = productViewRepository.save(view);
        log.debug("Recorded product view {} for product {}", persisted.getId(), productId);
        return persisted.getId();
    }

    private ProductVariant resolveVariant(Product product, UUID variantId) {
        if (variantId == null) {
            return null;
        }
        ProductVariant variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new ProductVariantNotFoundException(variantId));

        if (variant.getProduct() != null && !variant.getProduct().getId().equals(product.getId())) {
            throw new ProductVariantNotFoundException(variantId);
        }
        return variant;
    }

    private User resolveUser(String authenticatedEmail) {
        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(authenticatedEmail)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + authenticatedEmail));
    }
}

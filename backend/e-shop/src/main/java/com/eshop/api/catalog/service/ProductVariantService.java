package com.eshop.api.catalog.service;

import com.eshop.api.catalog.dto.ProductVariantCreateRequest;
import com.eshop.api.catalog.dto.ProductVariantResponse;
import com.eshop.api.catalog.dto.ProductVariantUpdateRequest;
import com.eshop.api.catalog.model.Color;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.catalog.repository.ColorRepository;
import com.eshop.api.catalog.repository.ProductRepository;
import com.eshop.api.catalog.repository.ProductVariantRepository;
import com.eshop.api.exception.ColorNotFoundException;
import com.eshop.api.exception.DuplicateProductVariantException;
import com.eshop.api.exception.ProductNotFoundException;
import com.eshop.api.exception.ProductVariantInUseException;
import com.eshop.api.exception.ProductVariantNotFoundException;
import com.eshop.api.order.repository.OrderItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProductVariantService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ColorRepository colorRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductMapper productMapper;

    public List<ProductVariantResponse> createVariants(UUID productId, ProductVariantCreateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        Color color = colorRepository.findById(request.colorId())
            .orElseThrow(() -> new ColorNotFoundException(request.colorId()));

        List<ProductVariantResponse> created = new ArrayList<>();
        for (ProductVariantCreateRequest.VariantPayload payload : request.variants()) {
            String normalizedSize = normalize(payload.size());
            if (normalizedSize != null && productVariantRepository.existsByProduct_IdAndColor_IdAndSizeIgnoreCase(
                productId,
                color.getId(),
                normalizedSize
            )) {
                throw new DuplicateProductVariantException(
                    "Variant already exists for color " + color.getName() + " and size " + payload.size()
                );
            }

            if (payload.sku() != null && productVariantRepository.existsByVariantSkuIgnoreCase(payload.sku())) {
                throw new DuplicateProductVariantException("Variant SKU already exists: " + payload.sku());
            }

            ProductVariant variant = ProductVariant.builder()
                .product(product)
                .color(color)
                .size(payload.size())
                .fit(payload.fit())
                .variantSku(payload.sku())
                .price(payload.price() != null ? payload.price() : defaultPrice(product))
                .quantityInStock(payload.quantity())
                .active(payload.active() != null ? payload.active() : Boolean.TRUE)
                .currency(payload.currency())
                .attributeValues(new HashSet<>())
                .build();

            ProductVariant saved = productVariantRepository.save(variant);
            created.add(productMapper.toVariantResponse(saved));
        }

        return created;
    }

    @Transactional(readOnly = true)
    public List<ProductVariantResponse> listVariants(UUID productId) {
        Product product = productRepository.findWithDetailsById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        return product.getVariants().stream()
            .map(productMapper::toVariantResponse)
            .toList();
    }

    public ProductVariantResponse updateVariant(UUID productId, UUID variantId, ProductVariantUpdateRequest request) {
        ProductVariant variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new ProductVariantNotFoundException(variantId));

        if (!variant.getProduct().getId().equals(productId)) {
            throw new ProductVariantNotFoundException(variantId);
        }

        if (request.sku() != null && !request.sku().equalsIgnoreCase(variant.getVariantSku())) {
            if (productVariantRepository.existsByVariantSkuIgnoreCaseAndIdNot(request.sku(), variant.getId())) {
                throw new DuplicateProductVariantException("Variant SKU already exists: " + request.sku());
            }
            variant.setVariantSku(request.sku());
        }

        if (request.price() != null) {
            variant.setPrice(request.price());
        }

        if (request.quantity() != null) {
            variant.setQuantityInStock(request.quantity());
        }

        if (request.active() != null) {
            variant.setActive(request.active());
        }

        Integer colorId = variant.getColor() != null ? variant.getColor().getId() : null;
        if (request.colorId() != null) {
            Color color = colorRepository.findById(request.colorId())
                .orElseThrow(() -> new ColorNotFoundException(request.colorId()));
            variant.setColor(color);
            colorId = color.getId();
        }

        if (request.size() != null) {
            String normalized = normalize(request.size());
            if (normalized != null
                && colorId != null
                && productVariantRepository.existsByProduct_IdAndColor_IdAndSizeIgnoreCaseAndIdNot(
                    productId,
                    colorId,
                    normalized,
                    variant.getId()
                )) {
                throw new DuplicateProductVariantException("Variant already exists for size " + request.size());
            }
            variant.setSize(request.size());
        }

        if (request.fit() != null) {
            variant.setFit(request.fit());
        }

        if (request.currency() != null) {
            variant.setCurrency(request.currency());
        }

        ProductVariant saved = productVariantRepository.save(variant);
        return productMapper.toVariantResponse(saved);
    }

    public void deleteVariant(UUID productId, UUID variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new ProductVariantNotFoundException(variantId));

        if (!variant.getProduct().getId().equals(productId)) {
            throw new ProductVariantNotFoundException(variantId);
        }

        if (orderItemRepository.existsByVariant_Id(variantId)) {
            throw new ProductVariantInUseException(variantId);
        }

        productVariantRepository.delete(variant);
        log.info("Deleted variant {} for product {}", variantId, productId);
    }

    public ProductVariantResponse updateVariantStatus(UUID productId, UUID variantId, boolean active) {
        ProductVariant variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new ProductVariantNotFoundException(variantId));

        if (!variant.getProduct().getId().equals(productId)) {
            throw new ProductVariantNotFoundException(variantId);
        }

        variant.setActive(active);
        ProductVariant saved = productVariantRepository.save(variant);
        return productMapper.toVariantResponse(saved);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private BigDecimal defaultPrice(Product product) {
        return product.getBasePrice() != null ? product.getBasePrice() : BigDecimal.ZERO;
    }
}

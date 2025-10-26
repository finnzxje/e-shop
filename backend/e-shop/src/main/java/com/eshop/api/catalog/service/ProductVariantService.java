package com.eshop.api.catalog.service;

import com.eshop.api.catalog.dto.ProductVariantCreateRequest;
import com.eshop.api.catalog.dto.ProductVariantResponse;
import com.eshop.api.catalog.dto.ProductVariantStockAdjustmentRequest;
import com.eshop.api.catalog.dto.ProductVariantStockAdjustmentResponse;
import com.eshop.api.catalog.dto.ProductVariantUpdateRequest;
import com.eshop.api.catalog.model.Color;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.catalog.model.ProductVariantStockAdjustment;
import com.eshop.api.catalog.repository.ColorRepository;
import com.eshop.api.catalog.repository.ProductRepository;
import com.eshop.api.catalog.repository.ProductVariantRepository;
import com.eshop.api.catalog.repository.ProductVariantStockAdjustmentRepository;
import com.eshop.api.exception.ColorNotFoundException;
import com.eshop.api.exception.DuplicateProductVariantException;
import com.eshop.api.exception.ProductNotFoundException;
import com.eshop.api.exception.ProductVariantInUseException;
import com.eshop.api.exception.ProductVariantNotFoundException;
import com.eshop.api.order.repository.OrderItemRepository;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProductVariantService {

    private static final String REASON_INITIAL_CREATION = "initial_creation";
    private static final String REASON_VARIANT_UPDATE = "variant_update";

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ColorRepository colorRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantStockAdjustmentRepository stockAdjustmentRepository;
    private final UserRepository userRepository;
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
            recordStockAdjustment(saved, 0, saved.getQuantityInStock(), REASON_INITIAL_CREATION, null, null);
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

        Integer previousQuantityObj = variant.getQuantityInStock();
        int previousQuantity = previousQuantityObj != null ? previousQuantityObj : 0;
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

            String normalizedSize = normalize(variant.getSize());
            if (normalizedSize != null
                && productVariantRepository.existsByProduct_IdAndColor_IdAndSizeIgnoreCaseAndIdNot(
                    productId,
                    colorId,
                    normalizedSize,
                    variant.getId()
                )) {
                throw new DuplicateProductVariantException("Variant already exists for color " + color.getName() + " and size " + variant.getSize());
            }
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

        int currentQuantity = Optional.ofNullable(variant.getQuantityInStock()).orElse(0);
        if (request.quantity() != null && previousQuantity != currentQuantity) {
            recordStockAdjustment(
                saved,
                previousQuantity,
                currentQuantity,
                REASON_VARIANT_UPDATE,
                null,
                null
            );
        }

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

    public ProductVariantStockAdjustmentResponse adjustVariantStock(UUID productId,
                                                                    UUID variantId,
                                                                    ProductVariantStockAdjustmentRequest request,
                                                                    String adjustedByEmail) {
        ProductVariant variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new ProductVariantNotFoundException(variantId));

        if (!variant.getProduct().getId().equals(productId)) {
            throw new ProductVariantNotFoundException(variantId);
        }

        int previousQuantity = Optional.ofNullable(variant.getQuantityInStock()).orElse(0);
        int newQuantity = request.newQuantity();

        variant.setQuantityInStock(newQuantity);
        productVariantRepository.save(variant);

        User adjustedBy = adjustedByEmail != null
            ? userRepository.findByEmailIgnoreCase(adjustedByEmail).orElse(null)
            : null;

        ProductVariantStockAdjustment adjustment = recordStockAdjustment(
            variant,
            previousQuantity,
            newQuantity,
            trim(request.reason()),
            trim(request.notes()),
            adjustedBy
        );
        return toAdjustmentResponse(adjustment);
    }

    @Transactional(readOnly = true)
    public List<ProductVariantStockAdjustmentResponse> listStockAdjustments(UUID productId, UUID variantId) {
        ProductVariant variant = productVariantRepository.findById(variantId)
            .orElseThrow(() -> new ProductVariantNotFoundException(variantId));

        if (!variant.getProduct().getId().equals(productId)) {
            throw new ProductVariantNotFoundException(variantId);
        }

        return stockAdjustmentRepository.findByVariant_IdOrderByAdjustedAtDesc(variantId).stream()
            .map(this::toAdjustmentResponse)
            .toList();
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

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private ProductVariantStockAdjustmentResponse toAdjustmentResponse(ProductVariantStockAdjustment adjustment) {
        ProductVariantStockAdjustmentResponse.AdjustedBy adjustedBy = null;
        User user = adjustment.getAdjustedBy();
        if (user != null) {
            adjustedBy = ProductVariantStockAdjustmentResponse.AdjustedBy.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
        }

        return ProductVariantStockAdjustmentResponse.builder()
            .id(adjustment.getId())
            .previousQuantity(adjustment.getPreviousQuantity())
            .newQuantity(adjustment.getNewQuantity())
            .delta(adjustment.getDelta())
            .reason(adjustment.getReason())
            .notes(adjustment.getNotes())
            .adjustedAt(adjustment.getAdjustedAt())
            .adjustedBy(adjustedBy)
            .build();
    }

    private ProductVariantStockAdjustment recordStockAdjustment(ProductVariant variant,
                                                                 int previousQuantity,
                                                                 int newQuantity,
                                                                 String reason,
                                                                 String notes,
                                                                 User adjustedBy) {
        String normalizedReason = reason != null ? reason.trim() : null;
        ProductVariantStockAdjustment adjustment = ProductVariantStockAdjustment.builder()
            .variant(variant)
            .previousQuantity(previousQuantity)
            .newQuantity(newQuantity)
            .delta(newQuantity - previousQuantity)
            .reason(normalizedReason != null ? normalizedReason : REASON_VARIANT_UPDATE)
            .notes(trim(notes))
            .adjustedBy(adjustedBy)
            .build();

        return stockAdjustmentRepository.save(adjustment);
    }
}

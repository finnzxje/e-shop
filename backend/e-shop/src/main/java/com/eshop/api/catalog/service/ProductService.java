package com.eshop.api.catalog.service;

import com.eshop.api.catalog.dto.*;
import com.eshop.api.catalog.model.*;
import com.eshop.api.catalog.repository.ProductRepository;
import com.eshop.api.exception.ProductNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;

    public PageResponse<ProductSummaryResponse> getProducts(Pageable pageable) {
        Page<Product> page = productRepository.findBy(pageable);
        List<ProductSummaryResponse> items = page.stream()
            .map(this::mapToSummary)
            .toList();

        return PageResponse.<ProductSummaryResponse>builder()
            .content(items)
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .page(page.getNumber())
            .size(page.getSize())
            .hasNext(page.hasNext())
            .hasPrevious(page.hasPrevious())
            .build();
    }

    public ProductResponse getProductBySlug(String slug) throws ProductNotFoundException {
        Product product = productRepository.findWithDetailsBySlug(slug)
            .orElseThrow(() -> new ProductNotFoundException(slug));
        return mapToResponse(product);
    }

    private ProductResponse mapToResponse(Product product) {
        return ProductResponse.builder()
            .id(product.getId())
            .name(product.getName())
            .slug(product.getSlug())
            .description(product.getDescription())
            .basePrice(product.getBasePrice())
            .status(product.getStatus())
            .featured(product.getFeatured())
            .gender(product.getGender())
            .taxonomyPath(product.getTaxonomyPath() != null ? List.copyOf(product.getTaxonomyPath()) : List.of())
            .productType(product.getProductType())
            .createdAt(product.getCreatedAt())
            .updatedAt(product.getUpdatedAt())
            .category(mapCategorySummary(product.getCategory()))
            .tags(mapTags(product.getTags()))
            .variants(mapVariants(product.getVariants()))
            .images(mapImages(product.getImages()))
            .build();
    }

    private ProductSummaryResponse mapToSummary(Product product) {
        return ProductSummaryResponse.builder()
            .id(product.getId())
            .name(product.getName())
            .slug(product.getSlug())
            .description(product.getDescription())
            .basePrice(product.getBasePrice())
            .status(product.getStatus())
            .featured(product.getFeatured())
            .gender(product.getGender())
            .productType(product.getProductType())
            .createdAt(product.getCreatedAt())
            .updatedAt(product.getUpdatedAt())
            .category(mapCategorySummary(product.getCategory()))
            .build();
    }

    private CategorySummary mapCategorySummary(Category category) {
        if (category == null) {
            return null;
        }
        return CategorySummary.builder()
            .id(category.getId())
            .name(category.getName())
            .slug(category.getSlug())
            .build();
    }

    private List<ProductTagResponse> mapTags(Set<ProductTag> tags) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }
        return tags.stream()
            .sorted(Comparator.comparing(ProductTag::getTag, String.CASE_INSENSITIVE_ORDER))
            .map(tag -> ProductTagResponse.builder()
                .id(tag.getId())
                .tag(tag.getTag())
                .build())
            .toList();
    }

    private List<ProductVariantResponse> mapVariants(Set<ProductVariant> variants) {
        if (variants == null || variants.isEmpty()) {
            return List.of();
        }
        return variants.stream()
            .sorted(Comparator
                .comparing(ProductVariant::getVariantSku, Comparator.nullsLast(String::compareToIgnoreCase))
                .thenComparing(ProductVariant::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(this::mapVariant)
            .toList();
    }

    private ProductVariantResponse mapVariant(ProductVariant variant) {
        return ProductVariantResponse.builder()
            .id(variant.getId())
            .variantSku(variant.getVariantSku())
            .price(variant.getPrice())
            .quantityInStock(variant.getQuantityInStock())
            .active(variant.getActive())
            .size(variant.getSize())
            .fit(variant.getFit())
            .currency(variant.getCurrency())
            .createdAt(variant.getCreatedAt())
            .color(mapColor(variant.getColor()))
            .attributes(mapVariantAttributes(variant.getAttributeValues()))
            .build();
    }

    private List<VariantAttributeValueResponse> mapVariantAttributes(Set<ProductAttributeValue> attributeValues) {
        if (attributeValues == null || attributeValues.isEmpty()) {
            return List.of();
        }
        return attributeValues.stream()
            .sorted(Comparator
                .comparing((ProductAttributeValue value) -> {
                    ProductAttribute attribute = value.getAttribute();
                    return attribute != null ? attribute.getName() : null;
                }, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                .thenComparing(ProductAttributeValue::getValue, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
            .map(value -> VariantAttributeValueResponse.builder()
                .valueId(value.getId())
                .value(value.getValue())
                .displayValue(value.getDisplayValue())
                .attributeId(value.getAttribute() != null ? value.getAttribute().getId() : null)
                .attributeName(value.getAttribute() != null ? value.getAttribute().getName() : null)
                .attributeType(value.getAttribute() != null ? value.getAttribute().getType() : null)
                .build())
            .toList();
    }

    private List<ProductImageResponse> mapImages(Set<ProductImage> images) {
        if (images == null || images.isEmpty()) {
            return List.of();
        }
        return images.stream()
            .sorted(Comparator
                .comparing(ProductImage::getDisplayOrder, Comparator.nullsLast(Integer::compareTo))
                .thenComparing(ProductImage::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
            .map(image -> ProductImageResponse.builder()
                .id(image.getId())
                .imageUrl(image.getImageUrl())
                .altText(image.getAltText())
                .displayOrder(image.getDisplayOrder())
                .primary(image.getPrimary())
                .createdAt(image.getCreatedAt())
                .color(mapColor(image.getColor()))
                .build())
            .toList();
    }

    private ColorResponse mapColor(Color color) {
        if (color == null) {
            return null;
        }
        return ColorResponse.builder()
            .id(color.getId())
            .code(color.getCode())
            .name(color.getName())
            .hex(color.getHex())
            .build();
    }
}

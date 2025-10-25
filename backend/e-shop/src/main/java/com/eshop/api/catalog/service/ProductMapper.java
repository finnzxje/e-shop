package com.eshop.api.catalog.service;

import com.eshop.api.catalog.dto.CategorySummary;
import com.eshop.api.catalog.dto.ColorResponse;
import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.catalog.dto.ProductImageResponse;
import com.eshop.api.catalog.dto.ProductResponse;
import com.eshop.api.catalog.dto.ProductSummaryResponse;
import com.eshop.api.catalog.dto.ProductTagResponse;
import com.eshop.api.catalog.dto.ProductVariantResponse;
import com.eshop.api.catalog.dto.VariantAttributeValueResponse;
import com.eshop.api.catalog.model.Category;
import com.eshop.api.catalog.model.Color;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductAttribute;
import com.eshop.api.catalog.model.ProductAttributeValue;
import com.eshop.api.catalog.model.ProductImage;
import com.eshop.api.catalog.model.ProductTag;
import com.eshop.api.catalog.model.ProductVariant;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Component
public class ProductMapper {

    public ProductResponse toProductResponse(Product product) {
        if (product == null) {
            return null;
        }

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

    public ProductSummaryResponse toProductSummary(Product product) {
        if (product == null) {
            return null;
        }

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

    public PageResponse<ProductSummaryResponse> toPageResponse(Page<Product> page) {
        List<ProductSummaryResponse> summaries = page.stream()
            .map(this::toProductSummary)
            .toList();

        return PageResponse.<ProductSummaryResponse>builder()
            .content(summaries)
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .page(page.getNumber())
            .size(page.getSize())
            .hasNext(page.hasNext())
            .hasPrevious(page.hasPrevious())
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
            .map(this::toVariantResponse)
            .toList();
    }

    public ProductVariantResponse toVariantResponse(ProductVariant variant) {
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
            .color(toColorResponse(variant.getColor()))
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
            .map(this::toImageResponse)
            .toList();
    }

    public ColorResponse toColorResponse(Color color) {
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

    public ProductImageResponse toImageResponse(ProductImage image) {
        if (image == null) {
            return null;
        }

        return ProductImageResponse.builder()
            .id(image.getId())
            .imageUrl(image.getImageUrl())
            .altText(image.getAltText())
            .displayOrder(image.getDisplayOrder())
            .primary(image.getPrimary())
            .createdAt(image.getCreatedAt())
            .color(toColorResponse(image.getColor()))
            .build();
    }
}

package com.eshop.api.catalog.service;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.catalog.dto.ProductResponse;
import com.eshop.api.catalog.dto.ProductStatusUpdateRequest;
import com.eshop.api.catalog.dto.ProductSummaryResponse;
import com.eshop.api.catalog.dto.ProductUpsertRequest;
import com.eshop.api.catalog.enums.Gender;
import com.eshop.api.catalog.enums.ProductStatus;
import com.eshop.api.catalog.model.Category;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductTag;
import com.eshop.api.catalog.repository.CategoryRepository;
import com.eshop.api.catalog.repository.ProductRepository;
import com.eshop.api.catalog.repository.ProductTagRepository;
import com.eshop.api.exception.CategoryNotFoundException;
import com.eshop.api.exception.ProductNotFoundException;
import com.eshop.api.exception.ProductSlugAlreadyExistsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductTagRepository productTagRepository;
    private final ProductMapper productMapper;

    @Transactional(readOnly = true)
    public PageResponse<ProductSummaryResponse> listProducts(
        ProductStatus status,
        Boolean featured,
        Gender gender,
        Integer categoryId,
        String search,
        Instant updatedAfter,
        Instant updatedBefore,
        Pageable pageable
    ) {
        Specification<Product> specification = Specification.where(null);

        if (status != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }

        if (featured != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("featured"), featured));
        }

        if (gender != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("gender"), gender));
        }

        if (categoryId != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("category").get("id"), categoryId));
        }

        if (search != null && !search.isBlank()) {
            String queryLike = "%" + search.trim().toLowerCase() + "%";
            specification = specification.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), queryLike),
                cb.like(cb.lower(root.get("slug")), queryLike),
                cb.like(cb.lower(root.get("description")), queryLike)
            ));
        }

        if (updatedAfter != null) {
            specification = specification.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("updatedAt"), updatedAfter));
        }

        if (updatedBefore != null) {
            specification = specification.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("updatedAt"), updatedBefore));
        }

        Page<Product> page = productRepository.findAll(specification, pageable);
        return productMapper.toPageResponse(page);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(UUID productId) {
        Product product = productRepository.findWithDetailsBySlug(
                productRepository.findById(productId)
                    .orElseThrow(() -> new ProductNotFoundException(productId))
                    .getSlug()
            )
            .orElseThrow(() -> new ProductNotFoundException(productId));

        return productMapper.toProductResponse(product);
    }

    @Transactional
    public ProductResponse createProduct(ProductUpsertRequest request) {
        String normalizedSlug = normalizeSlug(request.slug());
        if (productRepository.existsBySlugIgnoreCase(normalizedSlug)) {
            throw new ProductSlugAlreadyExistsException(normalizedSlug);
        }

        Category category = categoryRepository.findById(request.categoryId())
            .orElseThrow(() -> new CategoryNotFoundException(request.categoryId()));

        Product product = Product.builder()
            .name(request.name().trim())
            .slug(normalizedSlug)
            .description(Optional.ofNullable(request.description()).map(String::trim).orElse(null))
            .category(category)
            .basePrice(request.basePrice())
            .status(Optional.ofNullable(request.status()).orElse(ProductStatus.DRAFT))
            .featured(Boolean.TRUE.equals(request.featured()))
            .gender(request.gender())
            .productType(Optional.ofNullable(request.productType()).map(String::trim).orElse(null))
            .taxonomyPath(new ArrayList<>(normalizeTaxonomy(request.taxonomyPath())))
            .tags(new LinkedHashSet<>(resolveTags(request.tags())))
            .build();

        Product saved = productRepository.save(product);

        Product hydrated = productRepository.findWithDetailsBySlug(saved.getSlug())
            .orElseThrow(() -> new ProductNotFoundException(saved.getSlug()));

        log.info("Created product {} ({})", hydrated.getId(), hydrated.getSlug());
        return productMapper.toProductResponse(hydrated);
    }

    @Transactional
    public ProductResponse updateProduct(UUID productId, ProductUpsertRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        String normalizedSlug = normalizeSlug(request.slug());
        if (!product.getSlug().equalsIgnoreCase(normalizedSlug)
            && productRepository.existsBySlugIgnoreCase(normalizedSlug)) {
            throw new ProductSlugAlreadyExistsException(normalizedSlug);
        }

        Category category = categoryRepository.findById(request.categoryId())
            .orElseThrow(() -> new CategoryNotFoundException(request.categoryId()));

        product.setName(request.name().trim());
        product.setSlug(normalizedSlug);
        product.setDescription(Optional.ofNullable(request.description()).map(String::trim).orElse(null));
        product.setCategory(category);
        product.setBasePrice(request.basePrice());
        product.setStatus(Optional.ofNullable(request.status()).orElse(ProductStatus.DRAFT));
        product.setFeatured(Boolean.TRUE.equals(request.featured()));
        product.setGender(request.gender());
        product.setProductType(Optional.ofNullable(request.productType()).map(String::trim).orElse(null));
        product.setTaxonomyPath(new ArrayList<>(normalizeTaxonomy(request.taxonomyPath())));

        Set<ProductTag> tags = resolveTags(request.tags());
        product.getTags().clear();
        product.getTags().addAll(tags);

        Product saved = productRepository.save(product);
        Product hydrated = productRepository.findWithDetailsBySlug(saved.getSlug())
            .orElseThrow(() -> new ProductNotFoundException(saved.getSlug()));

        log.info("Updated product {} ({})", hydrated.getId(), hydrated.getSlug());
        return productMapper.toProductResponse(hydrated);
    }

    @Transactional
    public ProductResponse updateProductStatus(UUID productId, ProductStatusUpdateRequest request) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        product.setStatus(request.status());
        Product saved = productRepository.save(product);

        Product hydrated = productRepository.findWithDetailsBySlug(saved.getSlug())
            .orElseThrow(() -> new ProductNotFoundException(saved.getSlug()));

        log.info("Updated product {} status to {}", hydrated.getId(), hydrated.getStatus());
        return productMapper.toProductResponse(hydrated);
    }

    private String normalizeSlug(String slug) {
        return slug == null ? null : slug.trim().toLowerCase();
    }

    private List<String> normalizeTaxonomy(List<String> taxonomyPath) {
        if (taxonomyPath == null || taxonomyPath.isEmpty()) {
            return List.of();
        }

        return taxonomyPath.stream()
            .map(value -> value != null ? value.trim() : null)
            .filter(value -> value != null && !value.isEmpty())
            .distinct()
            .toList();
    }

    private Set<ProductTag> resolveTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return Set.of();
        }

        return tags.stream()
            .map(tag -> tag != null ? tag.trim() : null)
            .filter(tag -> tag != null && !tag.isEmpty())
            .map(String::toLowerCase)
            .distinct()
            .map(this::resolveTag)
            .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private ProductTag resolveTag(String tagValue) {
        return productTagRepository.findByTagIgnoreCase(tagValue)
            .orElseGet(() -> productTagRepository.save(ProductTag.builder().tag(tagValue).build()));
    }
}

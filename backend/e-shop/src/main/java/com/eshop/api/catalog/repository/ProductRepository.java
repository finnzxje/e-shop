package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.enums.ProductStatus;
import com.eshop.api.catalog.model.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findBySlug(String slug);

    boolean existsBySlugAndStatus(String slug, ProductStatus status);

    @EntityGraph(attributePaths = {
        "category",
        "tags",
        "variants",
        "variants.color",
        "variants.attributeValues",
        "variants.attributeValues.attribute",
        "images",
        "images.color"
    })
    Optional<Product> findWithDetailsBySlug(String slug);
}

package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.enums.ProductStatus;
import com.eshop.api.catalog.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findBySlug(String slug);

    Optional<Product> findBySku(String sku);

    boolean existsBySlugAndStatus(String slug, ProductStatus status);
}

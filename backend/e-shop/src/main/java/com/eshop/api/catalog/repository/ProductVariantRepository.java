package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

    Optional<ProductVariant> findByVariantSku(String variantSku);
}

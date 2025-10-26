package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.model.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

    Optional<ProductVariant> findByVariantSku(String variantSku);

    boolean existsByProduct_IdAndColor_IdAndSizeIgnoreCase(UUID productId, Integer colorId, String size);

    boolean existsByProduct_IdAndColor_IdAndSizeIgnoreCaseAndIdNot(UUID productId, Integer colorId, String size, UUID id);

    boolean existsByVariantSkuIgnoreCase(String variantSku);

    boolean existsByVariantSkuIgnoreCaseAndIdNot(String variantSku, UUID id);
}

package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.model.ProductVariantStockAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductVariantStockAdjustmentRepository extends JpaRepository<ProductVariantStockAdjustment, UUID> {

    List<ProductVariantStockAdjustment> findByVariant_IdOrderByAdjustedAtDesc(UUID variantId);
}

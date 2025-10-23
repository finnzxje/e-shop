package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.model.ProductReview;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductReviewRepository extends JpaRepository<ProductReview, UUID> {

    Page<ProductReview> findByProduct_Id(UUID productId, Pageable pageable);

    Optional<ProductReview> findByProduct_IdAndUser_Id(UUID productId, UUID userId);
}

package com.eshop.api.analytics.repository;

import com.eshop.api.analytics.model.ProductView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface ProductViewRepository extends JpaRepository<ProductView, UUID> {

    long countByViewedAtGreaterThanEqual(Instant viewedAt);
}

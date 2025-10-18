package com.eshop.api.analytics.repository;

import com.eshop.api.analytics.model.ProductInteractionEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProductInteractionEventRepository extends JpaRepository<ProductInteractionEvent, UUID> {
}

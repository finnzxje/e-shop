package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.model.ProductAttribute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductAttributeRepository extends JpaRepository<ProductAttribute, Integer> {

    Optional<ProductAttribute> findByNameIgnoreCase(String name);
}

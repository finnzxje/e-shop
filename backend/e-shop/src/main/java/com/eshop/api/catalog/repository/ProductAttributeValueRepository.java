package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.model.ProductAttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductAttributeValueRepository extends JpaRepository<ProductAttributeValue, Integer> {

    Optional<ProductAttributeValue> findByAttributeIdAndValue(Integer attributeId, String value);
}

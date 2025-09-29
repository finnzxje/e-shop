package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.model.ProductTag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductTagRepository extends JpaRepository<ProductTag, Integer> {

    Optional<ProductTag> findByTagIgnoreCase(String tag);
}

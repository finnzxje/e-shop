package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.enums.Gender;
import com.eshop.api.catalog.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

public interface ProductRepositoryCustom {

    Page<Product> findByFilters(
        Gender gender,
        List<Integer> categoryIds,
        List<String> colors,
        List<String> sizes,
        Boolean inStock,
        BigDecimal priceMin,
        BigDecimal priceMax,
        Pageable pageable
    );
}

package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Integer> {

    Optional<Category> findBySlug(String slug);

    boolean existsBySlug(String slug);
}

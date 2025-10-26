package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.enums.Gender;
import com.eshop.api.catalog.enums.ProductStatus;
import com.eshop.api.catalog.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product>, ProductRepositoryCustom {

    Optional<Product> findBySlug(String slug);

    boolean existsBySlugIgnoreCase(String slug);

    boolean existsBySlugAndStatus(String slug, ProductStatus status);

    @EntityGraph(attributePaths = {
        "category",
        "tags",
        "variants",
        "variants.color",
        "variants.attributeValues",
        "variants.attributeValues.attribute",
        "images",
        "images.color"
    })
    Optional<Product> findWithDetailsBySlug(String slug);

    @EntityGraph(attributePaths = {
        "category",
        "tags",
        "variants",
        "variants.color",
        "variants.attributeValues",
        "variants.attributeValues.attribute",
        "images",
        "images.color"
    })
    Optional<Product> findWithDetailsById(UUID id);

    @EntityGraph(attributePaths = "category")
    Page<Product> findBy(Pageable pageable);

    @EntityGraph(attributePaths = "category")
    Page<Product> findByGender(Gender gender, Pageable pageable);

    @EntityGraph(attributePaths = "category")
    Page<Product> findByCategory_IdIn(List<Integer> categoryIds, Pageable pageable);

    @EntityGraph(attributePaths = "category")
    Page<Product> findByGenderAndCategory_IdIn(Gender gender, List<Integer> categoryIds, Pageable pageable);

    @EntityGraph(attributePaths = "category")
    Page<Product> findByNameContainingIgnoreCaseOrSlugContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
        String name,
        String slug,
        String description,
        Pageable pageable);

    @EntityGraph(attributePaths = "category")
    Page<Product> findAll(Specification<Product> specification, Pageable pageable);
}

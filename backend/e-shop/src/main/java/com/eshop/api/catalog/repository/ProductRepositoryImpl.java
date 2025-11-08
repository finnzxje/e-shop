package com.eshop.api.catalog.repository;

import com.eshop.api.catalog.enums.Gender;
import com.eshop.api.catalog.enums.ProductStatus;
import com.eshop.api.catalog.model.Color;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductVariant;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Repository
public class ProductRepositoryImpl implements ProductRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Page<Product> findByFilters(
        Gender gender,
        List<Integer> categoryIds,
        List<String> colors,
        List<String> sizes,
        Boolean inStock,
        BigDecimal priceMin,
        BigDecimal priceMax,
        ProductStatus status,
        Pageable pageable
    ) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();

        CriteriaQuery<Product> query = cb.createQuery(Product.class);
        Root<Product> root = query.from(Product.class);
        root.fetch("category", JoinType.LEFT);

        List<Predicate> predicates = new ArrayList<>();
        Join<Product, ProductVariant> variantJoin = null;
        Join<ProductVariant, Color> colorJoin = null;

        if (gender != null) {
            predicates.add(cb.equal(root.get("gender"), gender));
        }

        if (categoryIds != null && !categoryIds.isEmpty()) {
            predicates.add(root.get("category").get("id").in(categoryIds));
        }

        if (status != null) {
            predicates.add(cb.equal(root.get("status"), status));
        }

        if (colors != null && !colors.isEmpty()) {
            variantJoin = ensureVariantJoin(root, query, variantJoin, false);
            colorJoin = variantJoin.join("color", JoinType.LEFT);

            Expression<String> codeExpr = cb.lower(colorJoin.get("code"));
            Expression<String> nameExpr = cb.lower(colorJoin.get("name"));
            predicates.add(cb.or(codeExpr.in(colors), nameExpr.in(colors)));
        }

        if (sizes != null && !sizes.isEmpty()) {
            variantJoin = ensureVariantJoin(root, query, variantJoin, false);
            Expression<String> sizeExpr = cb.lower(variantJoin.get("size"));
            predicates.add(sizeExpr.in(sizes));
        }

        if (Boolean.TRUE.equals(inStock)) {
            variantJoin = ensureVariantJoin(root, query, variantJoin, false);
            predicates.add(cb.greaterThan(variantJoin.get("quantityInStock"), 0));
        }

        if (priceMin != null) {
            variantJoin = ensureVariantJoin(root, query, variantJoin, false);
            Expression<BigDecimal> priceExpression = cb.coalesce(variantJoin.get("price"), root.get("basePrice"));
            predicates.add(cb.greaterThanOrEqualTo(priceExpression, priceMin));
        }

        if (priceMax != null) {
            variantJoin = ensureVariantJoin(root, query, variantJoin, false);
            Expression<BigDecimal> priceExpression = cb.coalesce(variantJoin.get("price"), root.get("basePrice"));
            predicates.add(cb.lessThanOrEqualTo(priceExpression, priceMax));
        }

        query.select(root).distinct(true);
        if (!predicates.isEmpty()) {
            query.where(cb.and(predicates.toArray(new Predicate[0])));
        }

        applySorting(pageable, cb, query, root);

        TypedQuery<Product> typedQuery = entityManager.createQuery(query);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<Product> content = typedQuery.getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Product> countRoot = countQuery.from(Product.class);

        List<Predicate> countPredicates = new ArrayList<>();
        Join<Product, ProductVariant> countVariantJoin = null;
        Join<ProductVariant, Color> countColorJoin = null;

        if (gender != null) {
            countPredicates.add(cb.equal(countRoot.get("gender"), gender));
        }

        if (categoryIds != null && !categoryIds.isEmpty()) {
            countPredicates.add(countRoot.get("category").get("id").in(categoryIds));
        }

        if (status != null) {
            countPredicates.add(cb.equal(countRoot.get("status"), status));
        }

        if (colors != null && !colors.isEmpty()) {
            countVariantJoin = ensureVariantJoin(countRoot, countQuery, countVariantJoin, true);
            countColorJoin = countVariantJoin.join("color", JoinType.LEFT);
            Expression<String> codeExpr = cb.lower(countColorJoin.get("code"));
            Expression<String> nameExpr = cb.lower(countColorJoin.get("name"));
            countPredicates.add(cb.or(codeExpr.in(colors), nameExpr.in(colors)));
        }

        if (sizes != null && !sizes.isEmpty()) {
            countVariantJoin = ensureVariantJoin(countRoot, countQuery, countVariantJoin, true);
            Expression<String> sizeExpr = cb.lower(countVariantJoin.get("size"));
            countPredicates.add(sizeExpr.in(sizes));
        }

        if (Boolean.TRUE.equals(inStock)) {
            countVariantJoin = ensureVariantJoin(countRoot, countQuery, countVariantJoin, true);
            countPredicates.add(cb.greaterThan(countVariantJoin.get("quantityInStock"), 0));
        }

        if (priceMin != null) {
            countVariantJoin = ensureVariantJoin(countRoot, countQuery, countVariantJoin, true);
            Expression<BigDecimal> priceExpression = cb.coalesce(countVariantJoin.get("price"), countRoot.get("basePrice"));
            countPredicates.add(cb.greaterThanOrEqualTo(priceExpression, priceMin));
        }

        if (priceMax != null) {
            countVariantJoin = ensureVariantJoin(countRoot, countQuery, countVariantJoin, true);
            Expression<BigDecimal> priceExpression = cb.coalesce(countVariantJoin.get("price"), countRoot.get("basePrice"));
            countPredicates.add(cb.lessThanOrEqualTo(priceExpression, priceMax));
        }

        if (!countPredicates.isEmpty()) {
            countQuery.where(cb.and(countPredicates.toArray(new Predicate[0])));
        }

        countQuery.select(cb.countDistinct(countRoot));
        Long total = entityManager.createQuery(countQuery).getSingleResult();

        return new PageImpl<>(content, pageable, total);
    }

    private Join<Product, ProductVariant> ensureVariantJoin(
        Root<Product> root,
        CriteriaQuery<?> query,
        Join<Product, ProductVariant> current,
        boolean countQuery
    ) {
        if (current == null) {
            current = root.join("variants", JoinType.LEFT);
            if (!countQuery) {
                query.distinct(true);
            }
        }
        return current;
    }

    private void applySorting(Pageable pageable, CriteriaBuilder cb, CriteriaQuery<Product> query, Root<Product> root) {
        if (pageable == null || pageable.getSort().isUnsorted()) {
            return;
        }

        List<jakarta.persistence.criteria.Order> orders = new ArrayList<>();
        for (Sort.Order order : pageable.getSort()) {
            String property = order.getProperty();
            if (property == null || property.isBlank()) {
                continue;
            }

            try {
                jakarta.persistence.criteria.Path<Object> path = root.get(property.trim());
                orders.add(order.isAscending() ? cb.asc(path) : cb.desc(path));
            } catch (IllegalArgumentException ignored) {
                // Ignore invalid sort properties to keep behaviour consistent with default queries
            }
        }

        if (!orders.isEmpty()) {
            query.orderBy(orders);
        }
    }
}

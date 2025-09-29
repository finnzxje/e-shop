package com.eshop.api.catalog.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(
    name = "product_variants",
    indexes = {
        @Index(name = "idx_variants_product", columnList = "product_id"),
        @Index(name = "idx_variants_color", columnList = "color_id"),
        @Index(name = "idx_variants_active", columnList = "is_active")
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariant {

    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "variant_sku", length = 128, unique = true)
    private String variantSku;

    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "quantity_in_stock", nullable = false)
    @Builder.Default
    private Integer quantityInStock = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "size", length = 64)
    private String size;

    @Column(name = "fit", length = 64)
    private String fit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "color_id")
    private Color color;

    @Column(name = "currency", length = 8)
    private String currency;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "variant_attribute_values",
        joinColumns = @JoinColumn(name = "variant_id"),
        inverseJoinColumns = @JoinColumn(name = "attribute_value_id"),
        uniqueConstraints = {
            @UniqueConstraint(name = "pk_variant_attribute_values", columnNames = {"variant_id", "attribute_value_id"})
        }
    )
    @Builder.Default
    private Set<ProductAttributeValue> attributeValues = new HashSet<>();
}

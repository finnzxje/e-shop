package com.eshop.api.catalog.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(
    name = "product_attribute_values",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_attr_value", columnNames = {"attribute_id", "value"})
    }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductAttributeValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attribute_id", nullable = false)
    private ProductAttribute attribute;

    @Column(name = "value", nullable = false, length = 256)
    private String value;

    @Column(name = "display_value", length = 256)
    private String displayValue;

    @ManyToMany(mappedBy = "attributeValues", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<ProductVariant> variants = new HashSet<>();
}

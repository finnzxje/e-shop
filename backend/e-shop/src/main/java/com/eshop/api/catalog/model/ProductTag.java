package com.eshop.api.catalog.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "product_tags")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductTag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "tag", nullable = false, unique = true, length = 128)
    private String tag;

    @ManyToMany(mappedBy = "tags", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Product> products = new HashSet<>();
}

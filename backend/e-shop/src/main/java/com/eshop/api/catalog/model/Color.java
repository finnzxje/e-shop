package com.eshop.api.catalog.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Check;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "colors")
@Check(name = "colors_hex_format_chk", constraints = "hex IS NULL OR hex ~ '^#[0-9A-Fa-f]{6}$'")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Color {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "code", nullable = false, unique = true, length = 64)
    private String code;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "swatch_url", length = 1024)
    private String swatchUrl;

    @Column(name = "hex", length = 7)
    private String hex;

    @OneToMany(mappedBy = "color", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<ProductVariant> variants = new HashSet<>();

    @OneToMany(mappedBy = "color", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<ProductImage> images = new HashSet<>();
}

package com.eshop.api.catalog.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

public enum ProductStatus {
    DRAFT("draft"),
    ACTIVE("active"),
    ARCHIVED("archived");

    private final String value;

    ProductStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static ProductStatus fromValue(String value) {
        if (value == null) {
            return null;
        }
        return Arrays.stream(ProductStatus.values())
            .filter(status -> status.value.equalsIgnoreCase(value))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown product status value: " + value));
    }
}

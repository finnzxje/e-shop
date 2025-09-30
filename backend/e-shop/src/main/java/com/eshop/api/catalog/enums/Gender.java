package com.eshop.api.catalog.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

public enum Gender {
    mens("mens"),
    womens("womens"),
    unisex("unisex"),
    kids("kids"),
    unknown("unknown");

    private final String value;

    Gender(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static Gender fromValue(String value) {
        if (value == null) {
            return null;
        }
        return Arrays.stream(Gender.values())
            .filter(gender -> gender.value.equalsIgnoreCase(value))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown gender value: " + value));
    }
}

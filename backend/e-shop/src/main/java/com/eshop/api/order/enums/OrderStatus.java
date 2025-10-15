package com.eshop.api.order.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

public enum OrderStatus {
    PENDING("PENDING"),
    AWAITING_PAYMENT("AWAITING_PAYMENT"),
    PROCESSING("PROCESSING"),
    FULFILLED("FULFILLED"),
    CANCELLED("CANCELLED");

    private final String dbValue;

    OrderStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public static OrderStatus fromDbValue(String dbValue) {
        if (dbValue == null) {
            return null;
        }
        String normalized = dbValue.trim().toUpperCase(Locale.ENGLISH);
        for (OrderStatus status : values()) {
            if (status.dbValue.equals(normalized)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown order status: " + dbValue);
    }

    @Converter(autoApply = true)
    public static class ConverterImpl implements AttributeConverter<OrderStatus, String> {
        @Override
        public String convertToDatabaseColumn(OrderStatus attribute) {
            return attribute == null ? null : attribute.getDbValue();
        }

        @Override
        public OrderStatus convertToEntityAttribute(String dbData) {
            return OrderStatus.fromDbValue(dbData);
        }
    }
}

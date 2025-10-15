package com.eshop.api.order.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

public enum OrderAddressType {
    SHIPPING("SHIPPING"),
    BILLING("BILLING");

    private final String dbValue;

    OrderAddressType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public static OrderAddressType fromDbValue(String dbValue) {
        if (dbValue == null) {
            return null;
        }
        String normalized = dbValue.trim().toUpperCase(Locale.ENGLISH);
        for (OrderAddressType type : values()) {
            if (type.dbValue.equals(normalized)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown order address type: " + dbValue);
    }

    @Converter(autoApply = true)
    public static class ConverterImpl implements AttributeConverter<OrderAddressType, String> {
        @Override
        public String convertToDatabaseColumn(OrderAddressType attribute) {
            return attribute == null ? null : attribute.getDbValue();
        }

        @Override
        public OrderAddressType convertToEntityAttribute(String dbData) {
            return OrderAddressType.fromDbValue(dbData);
        }
    }
}

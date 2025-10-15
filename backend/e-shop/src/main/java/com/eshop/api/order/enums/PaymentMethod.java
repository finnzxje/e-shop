package com.eshop.api.order.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

public enum PaymentMethod {
    CARD("CARD"),
    CASH_ON_DELIVERY("CASH_ON_DELIVERY"),
    BANK_TRANSFER("BANK_TRANSFER"),
    WALLET("WALLET"),
    MANUAL("MANUAL"),
    UNKNOWN("UNKNOWN");

    private final String dbValue;

    PaymentMethod(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public static PaymentMethod fromDbValue(String dbValue) {
        if (dbValue == null) {
            return null;
        }
        String normalized = dbValue.trim().toUpperCase(Locale.ENGLISH);
        for (PaymentMethod method : values()) {
            if (method.dbValue.equals(normalized)) {
                return method;
            }
        }
        throw new IllegalArgumentException("Unknown payment method: " + dbValue);
    }

    @Converter(autoApply = true)
    public static class ConverterImpl implements AttributeConverter<PaymentMethod, String> {
        @Override
        public String convertToDatabaseColumn(PaymentMethod attribute) {
            return attribute == null ? null : attribute.getDbValue();
        }

        @Override
        public PaymentMethod convertToEntityAttribute(String dbData) {
            return PaymentMethod.fromDbValue(dbData);
        }
    }
}

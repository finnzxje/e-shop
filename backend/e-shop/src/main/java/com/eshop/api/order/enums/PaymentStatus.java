package com.eshop.api.order.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

public enum PaymentStatus {
    PENDING("PENDING"),
    AUTHORIZED("AUTHORIZED"),
    CAPTURED("CAPTURED"),
    FAILED("FAILED"),
    VOIDED("VOIDED");

    private final String dbValue;

    PaymentStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public static PaymentStatus fromDbValue(String dbValue) {
        if (dbValue == null) {
            return null;
        }
        String normalized = dbValue.trim().toUpperCase(Locale.ENGLISH);
        for (PaymentStatus status : values()) {
            if (status.dbValue.equals(normalized)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown payment status: " + dbValue);
    }

    @Converter(autoApply = true)
    public static class ConverterImpl implements AttributeConverter<PaymentStatus, String> {
        @Override
        public String convertToDatabaseColumn(PaymentStatus attribute) {
            return attribute == null ? null : attribute.getDbValue();
        }

        @Override
        public PaymentStatus convertToEntityAttribute(String dbData) {
            return PaymentStatus.fromDbValue(dbData);
        }
    }
}

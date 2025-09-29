package com.eshop.api.catalog.converter;

import com.eshop.api.catalog.enums.ProductStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ProductStatusConverter implements AttributeConverter<ProductStatus, String> {

    @Override
    public String convertToDatabaseColumn(ProductStatus attribute) {
        return attribute != null ? attribute.getValue() : null;
    }

    @Override
    public ProductStatus convertToEntityAttribute(String dbData) {
        return dbData != null ? ProductStatus.fromValue(dbData) : null;
    }
}

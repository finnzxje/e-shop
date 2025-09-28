package com.eshop.api.catalog.converter;

import com.eshop.api.catalog.enums.Gender;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class GenderConverter implements AttributeConverter<Gender, String> {

    @Override
    public String convertToDatabaseColumn(Gender attribute) {
        return attribute != null ? attribute.getValue() : null;
    }

    @Override
    public Gender convertToEntityAttribute(String dbData) {
        return dbData != null ? Gender.fromValue(dbData) : null;
    }
}

package com.eshop.api.catalog.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class VariantAttributeValueResponse {
    Integer valueId;
    String value;
    String displayValue;
    Integer attributeId;
    String attributeName;
    String attributeType;
}

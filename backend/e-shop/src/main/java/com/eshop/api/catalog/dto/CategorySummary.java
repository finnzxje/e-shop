package com.eshop.api.catalog.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CategorySummary {
    Integer id;
    String name;
    String slug;
}

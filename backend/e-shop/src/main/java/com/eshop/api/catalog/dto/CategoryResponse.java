package com.eshop.api.catalog.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class CategoryResponse {
    Integer id;
    String name;
    String slug;
    Integer displayOrder;
    Boolean active;
    Integer parentCategoryId;
    Instant createdAt;
}

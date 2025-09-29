package com.eshop.api.catalog.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProductTagResponse {
    Integer id;
    String tag;
}

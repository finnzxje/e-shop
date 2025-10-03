package com.eshop.api.catalog.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ColorResponse {
    Integer id;
    String code;
    String name;
    String hex;
}

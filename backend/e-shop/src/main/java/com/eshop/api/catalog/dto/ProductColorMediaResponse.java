package com.eshop.api.catalog.dto;

import java.util.List;

public record ProductColorMediaResponse(
    ColorResponse color,
    List<ProductImageResponse> images,
    List<ProductVariantResponse> variants
) {
}

package com.eshop.api.catalog.recommendation.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ModelRecommendationItem {

    @JsonProperty("variant_id")
    private UUID variantId;

    @JsonProperty("similarity_score")
    private Double similarityScore;

    @JsonProperty("product_name")
    private String productName;

    @JsonProperty("category_name")
    private String categoryName;

    private BigDecimal price;

    @JsonProperty("image_path")
    private String imagePath;
}

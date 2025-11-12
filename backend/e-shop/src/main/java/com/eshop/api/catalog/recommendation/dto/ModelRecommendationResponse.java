package com.eshop.api.catalog.recommendation.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ModelRecommendationResponse {

    @JsonProperty("query_variant_id")
    private UUID queryVariantId;

    @Builder.Default
    private List<ModelRecommendationItem> recommendations = Collections.emptyList();

    @JsonProperty("response_time_ms")
    private Double responseTimeMs;

    @JsonProperty("from_cache")
    private Boolean fromCache;

    @JsonProperty("total_results")
    private Integer totalResults;

    public static ModelRecommendationResponse empty(UUID queryVariantId) {
        return ModelRecommendationResponse.builder()
            .queryVariantId(queryVariantId)
            .recommendations(Collections.emptyList())
            .fromCache(Boolean.FALSE)
            .responseTimeMs(0d)
            .totalResults(0)
            .build();
    }
}

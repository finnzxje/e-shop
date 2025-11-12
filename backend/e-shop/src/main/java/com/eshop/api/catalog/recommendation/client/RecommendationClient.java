package com.eshop.api.catalog.recommendation.client;

import com.eshop.api.catalog.recommendation.config.RecommendationProperties;
import com.eshop.api.catalog.recommendation.dto.ModelRecommendationResponse;
import com.eshop.api.exception.RecommendationServiceUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecommendationClient {

    private final RestTemplate recommendationRestTemplate;
    private final RecommendationProperties properties;

    public ModelRecommendationResponse fetchRecommendations(UUID variantId, int limit) {
        if (!properties.isEnabled()) {
            log.debug("Recommendation service disabled; returning empty response");
            return ModelRecommendationResponse.empty(variantId);
        }

        if (!StringUtils.hasText(properties.getBaseUrl())) {
            throw new RecommendationServiceUnavailableException("Recommendation service base URL is not configured");
        }

        URI uri = UriComponentsBuilder
            .fromUriString(properties.getBaseUrl())
            .pathSegment("recommend", variantId.toString())
            .queryParam("k", limit)
            .build()
            .toUri();

        try {
            ResponseEntity<ModelRecommendationResponse> response =
                recommendationRestTemplate.getForEntity(uri, ModelRecommendationResponse.class);
            if (response.getBody() == null) {
                log.warn("Recommendation service returned empty body for variant {}", variantId);
                return ModelRecommendationResponse.empty(variantId);
            }
            return response.getBody();
        } catch (RestClientException ex) {
            log.error("Failed to call recommendation service for variant {}", variantId, ex);
            throw new RecommendationServiceUnavailableException("Unable to reach recommendation service", ex);
        }
    }
}

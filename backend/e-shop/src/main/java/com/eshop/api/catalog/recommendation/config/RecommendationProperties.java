package com.eshop.api.catalog.recommendation.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
@ConfigurationProperties(prefix = "recommendation")
@Getter
@Setter
public class RecommendationProperties {

    /**
     * Base URL of the Python recommendation service (e.g. http://localhost:8000).
     */
    private String baseUrl;

    /**
     * Whether calling the external recommendation service is enabled.
     */
    private boolean enabled = true;

    /**
     * Maximum time to establish the HTTP connection.
     */
    private Duration connectTimeout = Duration.ofSeconds(2);

    /**
     * Maximum time to wait for the response body.
     */
    private Duration readTimeout = Duration.ofSeconds(3);
}

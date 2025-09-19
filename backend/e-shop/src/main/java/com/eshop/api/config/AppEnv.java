package com.eshop.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppEnv {

    private String baseURL;
    private Jwt jwt;

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private long accessExpirationSeconds;
        private long refreshExpirationSeconds;
    }
}
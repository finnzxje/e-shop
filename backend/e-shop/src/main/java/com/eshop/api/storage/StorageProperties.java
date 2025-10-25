package com.eshop.api.storage;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {

    private final Minio minio = new Minio();

    @Getter
    @Setter
    @Validated
    public static class Minio {
        @NotBlank
        private String endpoint;

        @NotBlank
        private String accessKey;

        @NotBlank
        private String secretKey;

        @NotBlank
        private String bucket;

        private String region;

        /**
         * Optional public base URL (e.g. CDN) for serving objects from this bucket.
         */
        private String publicUrl;
    }
}

package com.eshop.api.storage;

import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(StorageProperties.class)
@RequiredArgsConstructor
public class MinioConfiguration {

    private final StorageProperties storageProperties;

    @Bean
    public MinioClient minioClient() {
        StorageProperties.Minio minio = storageProperties.getMinio();
        MinioClient.Builder builder = MinioClient.builder()
                .endpoint(minio.getEndpoint())
                .credentials(minio.getAccessKey(), minio.getSecretKey());

        if (minio.getRegion() != null && !minio.getRegion().isBlank()) {
            builder.region(minio.getRegion());
        }

        return builder.build();
    }
}

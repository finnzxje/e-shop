package com.eshop.api.storage;

import com.eshop.api.exception.StorageException;
import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import io.minio.http.Method;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinioStorageService {

    private static final Duration DEFAULT_URL_EXPIRY = Duration.ofHours(1);

    private final MinioClient minioClient;
    private final StorageProperties storageProperties;

    @PostConstruct
    public void ensureBucketExists() {
        String bucket = storageProperties.getMinio().getBucket();
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket {}", bucket);
            }
            applyPublicReadPolicy(bucket);
        } catch (Exception e) {
            throw new StorageException("Failed to initialize MinIO bucket: " + bucket, e);
        }
    }

    public void uploadObject(String objectKey, InputStream inputStream, long size, String contentType) {
        String bucket = storageProperties.getMinio().getBucket();
        try {
            PutObjectArgs.Builder builder = PutObjectArgs.builder()
                .bucket(bucket)
                .object(objectKey)
                .stream(inputStream, size, -1);

            if (contentType != null && !contentType.isBlank()) {
                builder.contentType(contentType);
            }

            minioClient.putObject(builder.build());
        } catch (Exception e) {
            throw new StorageException("Failed to upload object to MinIO: " + objectKey, e);
        }
    }

    public String resolvePublicUrl(String objectKey) {
        StorageProperties.Minio minio = storageProperties.getMinio();
        String baseUrl = minio.getPublicUrl();
        if (baseUrl != null && !baseUrl.isBlank()) {
            return String.format("%s/%s/%s", stripTrailingSlash(baseUrl), minio.getBucket(), objectKey);
        }
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(minio.getBucket())
                .object(objectKey)
                .expiry((int) DEFAULT_URL_EXPIRY.toSeconds())
                .build());
        } catch (Exception e) {
            throw new StorageException("Failed to generate object URL for: " + objectKey, e);
        }
    }

    public String getBucketName() {
        return storageProperties.getMinio().getBucket();
    }

    private String stripTrailingSlash(String value) {
        if (value.endsWith("/")) {
            return value.substring(0, value.length() - 1);
        }
        return value;
    }

    private void applyPublicReadPolicy(String bucket) {
        String policy = """
            {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Principal": {"AWS": ["*"]},
                  "Action": ["s3:GetObject"],
                  "Resource": ["arn:aws:s3:::%s/*"]
                }
              ]
            }
            """.formatted(bucket);

        try {
            minioClient.setBucketPolicy(SetBucketPolicyArgs.builder()
                .bucket(bucket)
                .config(policy)
                .build());
            log.debug("Applied public-read policy to MinIO bucket {}", bucket);
        } catch (Exception e) {
            log.warn("Failed to apply public-read policy to bucket {}: {}", bucket, e.getMessage());
        }
    }
}

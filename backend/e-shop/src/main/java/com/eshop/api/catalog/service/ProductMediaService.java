package com.eshop.api.catalog.service;

import com.eshop.api.catalog.dto.ProductImageUploadRequest;
import com.eshop.api.catalog.dto.ProductImageResponse;
import com.eshop.api.catalog.model.Color;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductImage;
import com.eshop.api.catalog.repository.ColorRepository;
import com.eshop.api.catalog.repository.ProductImageRepository;
import com.eshop.api.catalog.repository.ProductRepository;
import com.eshop.api.exception.ColorNotFoundException;
import com.eshop.api.exception.InvalidImageUploadException;
import com.eshop.api.exception.ProductNotFoundException;
import com.eshop.api.exception.StorageException;
import com.eshop.api.storage.MinioStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProductMediaService {

    private static final String OBJECT_PREFIX = "products";

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final ColorRepository colorRepository;
    private final MinioStorageService minioStorageService;
    private final ProductMapper productMapper;

    public ProductImageResponse uploadProductImage(UUID productId,
                                                   MultipartFile file,
                                                   ProductImageUploadRequest metadata) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageUploadException("Image file is required");
        }

        ProductImageUploadRequest payload = metadata != null
            ? metadata
            : new ProductImageUploadRequest(null, null, null, null);

        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        String objectKey = buildObjectKey(productId, file.getOriginalFilename());

        try (InputStream inputStream = file.getInputStream()) {
            minioStorageService.uploadObject(objectKey, inputStream, file.getSize(), file.getContentType());
        } catch (IOException e) {
            throw new StorageException("Failed to read image upload", e);
        }

        String imageUrl = minioStorageService.resolvePublicUrl(objectKey);

        ProductImage productImage = ProductImage.builder()
            .product(product)
            .imageUrl(imageUrl)
            .altText(trim(payload.altText()))
            .displayOrder(Optional.ofNullable(payload.displayOrder()).orElse(0))
            .primary(Boolean.TRUE.equals(payload.primary()))
            .build();

        if (payload.colorId() != null) {
            Color color = colorRepository.findById(payload.colorId())
                .orElseThrow(() -> new ColorNotFoundException(payload.colorId()));
            productImage.setColor(color);
        }

        ProductImage saved = productImageRepository.save(productImage);
        log.info("Uploaded image {} for product {}", saved.getId(), productId);
        return productMapper.toImageResponse(saved);
    }

    private String buildObjectKey(UUID productId, String originalFilename) {
        String extension = extractExtension(originalFilename);
        String randomName = UUID.randomUUID().toString();

        if (!extension.isBlank()) {
            return String.format("%s/%s/%s.%s", OBJECT_PREFIX, productId, randomName, extension);
        }

        return String.format("%s/%s/%s", OBJECT_PREFIX, productId, randomName);
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "";
        }

        int lastDot = originalFilename.lastIndexOf('.');
        if (lastDot <= 0 || lastDot == originalFilename.length() - 1) {
            return "";
        }

        return originalFilename.substring(lastDot + 1).toLowerCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}

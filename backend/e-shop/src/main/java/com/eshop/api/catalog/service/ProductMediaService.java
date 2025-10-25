package com.eshop.api.catalog.service;

import com.eshop.api.catalog.dto.ColorResponse;
import com.eshop.api.catalog.dto.ProductColorMediaResponse;
import com.eshop.api.catalog.dto.ProductImageResponse;
import com.eshop.api.catalog.dto.ProductImageUpdateRequest;
import com.eshop.api.catalog.dto.ProductImageUploadRequest;
import com.eshop.api.catalog.dto.ProductVariantResponse;
import com.eshop.api.catalog.model.Color;
import com.eshop.api.catalog.model.Product;
import com.eshop.api.catalog.model.ProductImage;
import com.eshop.api.catalog.model.ProductVariant;
import com.eshop.api.catalog.repository.ColorRepository;
import com.eshop.api.catalog.repository.ProductImageRepository;
import com.eshop.api.catalog.repository.ProductRepository;
import com.eshop.api.exception.ColorNotFoundException;
import com.eshop.api.exception.InvalidImageUploadException;
import com.eshop.api.exception.ProductNotFoundException;
import com.eshop.api.exception.ProductImageNotFoundException;
import com.eshop.api.exception.StorageException;
import com.eshop.api.storage.MinioStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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

        if (metadata == null) {
            throw new InvalidImageUploadException("Image metadata is required");
        }

        ProductImageUploadRequest payload = metadata;

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

    @Transactional(readOnly = true, propagation = Propagation.SUPPORTS)
    public List<ProductColorMediaResponse> listProductColorMedia(UUID productId) {
        Product product = productRepository.findWithDetailsById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        Map<Integer, java.util.List<ProductVariantResponse>> variantsByColor = new LinkedHashMap<>();
        Map<Integer, java.util.List<ProductImageResponse>> imagesByColor = new LinkedHashMap<>();
        Map<Integer, Color> colorLookup = new LinkedHashMap<>();
        Set<Integer> colorOrder = new LinkedHashSet<>();

        for (ProductVariant variant : product.getVariants()) {
            Color color = variant.getColor();
            Integer colorId = color != null ? color.getId() : null;
            colorOrder.add(colorId);
            if (color != null) {
                colorLookup.putIfAbsent(colorId, color);
            }

            variantsByColor.computeIfAbsent(colorId, key -> new ArrayList<>())
                .add(productMapper.toVariantResponse(variant));
        }

        for (ProductImage image : product.getImages()) {
            Color color = image.getColor();
            Integer colorId = color != null ? color.getId() : null;
            colorOrder.add(colorId);
            if (color != null) {
                colorLookup.putIfAbsent(colorId, color);
            }

            imagesByColor.computeIfAbsent(colorId, key -> new ArrayList<>())
                .add(productMapper.toImageResponse(image));
        }

        List<ProductColorMediaResponse> result = new ArrayList<>();
        for (Integer colorId : colorOrder) {
            ColorResponse colorResponse = null;
            if (colorId != null && colorLookup.containsKey(colorId)) {
                colorResponse = productMapper.toColorResponse(colorLookup.get(colorId));
            }

            List<ProductImageResponse> images = new ArrayList<>(imagesByColor.getOrDefault(colorId, List.of()));
            images.sort(Comparator
                .comparing(ProductImageResponse::getDisplayOrder, Comparator.nullsLast(Integer::compareTo))
                .thenComparing(ProductImageResponse::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));

            List<ProductVariantResponse> variants = new ArrayList<>(variantsByColor.getOrDefault(colorId, List.of()));
            variants.sort(Comparator
                .comparing(ProductVariantResponse::getVariantSku, Comparator.nullsLast(String::compareToIgnoreCase))
                .thenComparing(ProductVariantResponse::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));

            result.add(new ProductColorMediaResponse(colorResponse, images, variants));
        }

        return result;
    }

    public ProductImageResponse updateProductImage(UUID productId,
                                                   UUID imageId,
                                                   ProductImageUpdateRequest request) {
        ProductImage image = productImageRepository.findById(imageId)
            .orElseThrow(() -> new ProductImageNotFoundException(imageId));

        if (!image.getProduct().getId().equals(productId)) {
            throw new ProductImageNotFoundException(imageId);
        }

        if (request.altText() != null) {
            image.setAltText(trim(request.altText()));
        }

        if (request.displayOrder() != null) {
            image.setDisplayOrder(request.displayOrder());
        }

        if (request.primary() != null) {
            image.setPrimary(request.primary());
        }

        if (request.colorId() != null) {
            Color color = colorRepository.findById(request.colorId())
                .orElseThrow(() -> new ColorNotFoundException(request.colorId()));
            image.setColor(color);
        }

        ProductImage saved = productImageRepository.save(image);
        log.info("Updated image {} for product {}", imageId, productId);
        return productMapper.toImageResponse(saved);
    }

    public void deleteProductImage(UUID productId, UUID imageId) {
        ProductImage image = productImageRepository.findById(imageId)
            .orElseThrow(() -> new ProductImageNotFoundException(imageId));

        if (!image.getProduct().getId().equals(productId)) {
            throw new ProductImageNotFoundException(imageId);
        }

        productImageRepository.delete(image);
        log.info("Deleted image {} for product {}", imageId, productId);
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

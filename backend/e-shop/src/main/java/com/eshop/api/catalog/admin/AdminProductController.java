package com.eshop.api.catalog.admin;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.catalog.dto.ProductColorMediaResponse;
import com.eshop.api.catalog.dto.ProductImageResponse;
import com.eshop.api.catalog.dto.ProductImageUpdateRequest;
import com.eshop.api.catalog.dto.ProductImageUploadRequest;
import com.eshop.api.catalog.dto.ProductResponse;
import com.eshop.api.catalog.dto.ProductStatusUpdateRequest;
import com.eshop.api.catalog.dto.ProductSummaryResponse;
import com.eshop.api.catalog.dto.ProductUpsertRequest;
import com.eshop.api.catalog.dto.ProductVariantCreateRequest;
import com.eshop.api.catalog.dto.ProductVariantResponse;
import com.eshop.api.catalog.dto.ProductVariantStockAdjustmentRequest;
import com.eshop.api.catalog.dto.ProductVariantStockAdjustmentResponse;
import com.eshop.api.catalog.dto.ProductVariantStatusRequest;
import com.eshop.api.catalog.dto.ProductVariantUpdateRequest;
import com.eshop.api.catalog.enums.Gender;
import com.eshop.api.catalog.enums.ProductStatus;
import com.eshop.api.catalog.service.ProductMediaService;
import com.eshop.api.catalog.service.AdminProductService;
import com.eshop.api.catalog.service.ProductVariantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/catalog/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final AdminProductService adminProductService;
    private final ProductMediaService productMediaService;
    private final ProductVariantService productVariantService;

    @GetMapping
    public ResponseEntity<PageResponse<ProductSummaryResponse>> listProducts(
        @RequestParam(value = "status", required = false) ProductStatus status,
        @RequestParam(value = "featured", required = false) Boolean featured,
        @RequestParam(value = "gender", required = false) Gender gender,
        @RequestParam(value = "categoryId", required = false) Integer categoryId,
        @RequestParam(value = "search", required = false) String search,
        @RequestParam(value = "updatedAfter", required = false) Instant updatedAfter,
        @RequestParam(value = "updatedBefore", required = false) Instant updatedBefore,
        @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PageResponse<ProductSummaryResponse> response = adminProductService.listProducts(
            status,
            featured,
            gender,
            categoryId,
            search,
            updatedAfter,
            updatedBefore,
            pageable
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ProductResponse> getProduct(@PathVariable("productId") UUID productId) {
        ProductResponse response = adminProductService.getProduct(productId);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductUpsertRequest request) {
        ProductResponse response = adminProductService.createProduct(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{productId}")
    public ResponseEntity<ProductResponse> updateProduct(
        @PathVariable("productId") UUID productId,
        @Valid @RequestBody ProductUpsertRequest request
    ) {
        ProductResponse response = adminProductService.updateProduct(productId, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{productId}/status")
    public ResponseEntity<ProductResponse> updateProductStatus(
        @PathVariable("productId") UUID productId,
        @Valid @RequestBody ProductStatusUpdateRequest request
    ) {
        ProductResponse response = adminProductService.updateProductStatus(productId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/{productId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductImageResponse> uploadProductImage(
        @PathVariable("productId") UUID productId,
        @RequestPart("file") MultipartFile file,
        @RequestParam(value = "altText", required = false) String altText,
        @RequestParam(value = "displayOrder", required = false) Integer displayOrder,
        @RequestParam(value = "primary", required = false) Boolean primary,
        @RequestParam(value = "colorId", required = false) Integer colorId
    ) {
        ProductImageUploadRequest metadata = new ProductImageUploadRequest(altText, displayOrder, primary, colorId);
        ProductImageResponse response = productMediaService.uploadProductImage(productId, file, metadata);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{productId}/colors")
    public ResponseEntity<List<ProductColorMediaResponse>> listProductColors(@PathVariable("productId") UUID productId) {
        List<ProductColorMediaResponse> response = productMediaService.listProductColorMedia(productId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{productId}/images/{imageId}")
    public ResponseEntity<ProductImageResponse> updateProductImage(
        @PathVariable("productId") UUID productId,
        @PathVariable("imageId") UUID imageId,
        @Valid @RequestBody ProductImageUpdateRequest request
    ) {
        ProductImageResponse response = productMediaService.updateProductImage(productId, imageId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{productId}/images/{imageId}")
    public ResponseEntity<Void> deleteProductImage(
        @PathVariable("productId") UUID productId,
        @PathVariable("imageId") UUID imageId
    ) {
        productMediaService.deleteProductImage(productId, imageId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{productId}/variants")
    public ResponseEntity<List<ProductVariantResponse>> listVariants(@PathVariable("productId") UUID productId) {
        List<ProductVariantResponse> response = productVariantService.listVariants(productId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{productId}/variants")
    public ResponseEntity<List<ProductVariantResponse>> createVariants(
        @PathVariable("productId") UUID productId,
        @Valid @RequestBody ProductVariantCreateRequest request
    ) {
        List<ProductVariantResponse> response = productVariantService.createVariants(productId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{productId}/variants/{variantId}")
    public ResponseEntity<ProductVariantResponse> updateVariant(
        @PathVariable("productId") UUID productId,
        @PathVariable("variantId") UUID variantId,
        @Valid @RequestBody ProductVariantUpdateRequest request
    ) {
        ProductVariantResponse response = productVariantService.updateVariant(productId, variantId, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{productId}/variants/{variantId}/status")
    public ResponseEntity<ProductVariantResponse> updateVariantStatus(
        @PathVariable("productId") UUID productId,
        @PathVariable("variantId") UUID variantId,
        @Valid @RequestBody ProductVariantStatusRequest request
    ) {
        ProductVariantResponse response = productVariantService.updateVariantStatus(productId, variantId, request.active());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{productId}/variants/{variantId}")
    public ResponseEntity<Void> deleteVariant(
        @PathVariable("productId") UUID productId,
        @PathVariable("variantId") UUID variantId
    ) {
        productVariantService.deleteVariant(productId, variantId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{productId}/variants/{variantId}/stock-adjustments")
    public ResponseEntity<ProductVariantStockAdjustmentResponse> adjustVariantStock(
        @PathVariable("productId") UUID productId,
        @PathVariable("variantId") UUID variantId,
        @Valid @RequestBody ProductVariantStockAdjustmentRequest request,
        Authentication authentication
    ) {
        ProductVariantStockAdjustmentResponse response = productVariantService.adjustVariantStock(
            productId,
            variantId,
            request,
            authentication != null ? authentication.getName() : null
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{productId}/variants/{variantId}/stock-adjustments")
    public ResponseEntity<List<ProductVariantStockAdjustmentResponse>> listVariantStockAdjustments(
        @PathVariable("productId") UUID productId,
        @PathVariable("variantId") UUID variantId
    ) {
        List<ProductVariantStockAdjustmentResponse> response = productVariantService.listStockAdjustments(productId, variantId);
        return ResponseEntity.ok(response);
    }
}

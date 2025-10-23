package com.eshop.api.catalog.admin;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.catalog.dto.ProductResponse;
import com.eshop.api.catalog.dto.ProductStatusUpdateRequest;
import com.eshop.api.catalog.dto.ProductSummaryResponse;
import com.eshop.api.catalog.dto.ProductUpsertRequest;
import com.eshop.api.catalog.enums.Gender;
import com.eshop.api.catalog.enums.ProductStatus;
import com.eshop.api.catalog.service.AdminProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/catalog/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final AdminProductService adminProductService;

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
}

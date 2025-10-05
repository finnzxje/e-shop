package com.eshop.api.catalog;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.catalog.dto.ProductResponse;
import com.eshop.api.catalog.dto.ProductSummaryResponse;
import com.eshop.api.catalog.enums.Gender;
import com.eshop.api.catalog.service.ProductService;
import com.eshop.api.exception.InvalidGenderException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/catalog/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<PageResponse<ProductSummaryResponse>> listProducts(
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<ProductSummaryResponse> response = productService.getProducts(pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/gender/{gender}")
    public ResponseEntity<PageResponse<ProductSummaryResponse>> listProductsByGender(
        @PathVariable("gender") String genderValue,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Gender gender = resolveGender(genderValue);
        PageResponse<ProductSummaryResponse> response = productService.getProductsByGender(gender, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/filter")
    public ResponseEntity<PageResponse<ProductSummaryResponse>> filterProducts(
        @RequestParam(value = "gender", required = false) String genderValue,
        @RequestParam(value = "category", required = false) String categorySlug,
        @RequestParam(value = "color", required = false) List<String> colors,
        @RequestParam(value = "sizes", required = false) List<String> sizes,
        @RequestParam(value = "inStock", required = false) Boolean inStock,
        @RequestParam(value = "priceMin", required = false) BigDecimal priceMin,
        @RequestParam(value = "priceMax", required = false) BigDecimal priceMax,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Gender gender = null;
        if (genderValue != null) {
            gender = resolveGender(genderValue);
        }

        PageResponse<ProductSummaryResponse> response = productService.getProductsByFilters(
            gender,
            categorySlug,
            colors,
            sizes,
            inStock,
            priceMin,
            priceMax,
            pageable
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<PageResponse<ProductSummaryResponse>> searchProducts(
        @RequestParam("q") String query,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<ProductSummaryResponse> response = productService.searchProducts(query, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/category/{slug}")
    public ResponseEntity<PageResponse<ProductSummaryResponse>> listProductsByCategory(
        @PathVariable("slug") String categorySlug,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        PageResponse<ProductSummaryResponse> response = productService.getProductsByCategorySlug(categorySlug, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ProductResponse> getProductBySlug(@PathVariable String slug) {
        ProductResponse response = productService.getProductBySlug(slug);
        return ResponseEntity.ok(response);
    }

    private Gender resolveGender(String genderValue) {
        if (genderValue == null || genderValue.isBlank()) {
            throw new InvalidGenderException(genderValue);
        }

        try {
            return Gender.fromValue(genderValue);
        } catch (IllegalArgumentException ex) {
            throw new InvalidGenderException(genderValue);
        }
    }
}

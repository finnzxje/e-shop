package com.eshop.api.analytics.controller;

import com.eshop.api.analytics.dto.ProductViewRequest;
import com.eshop.api.analytics.service.ProductViewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/products")
@RequiredArgsConstructor
public class ProductViewController {

    private final ProductViewService productViewService;

    @PostMapping("/{productId}/views")
    public ResponseEntity<Void> recordView(
        @PathVariable("productId") UUID productId,
        @Valid @RequestBody ProductViewRequest request,
        Authentication authentication
    ) {
        String email = authentication != null && authentication.isAuthenticated()
            ? authentication.getName()
            : null;

        productViewService.recordProductView(productId, request, email);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}

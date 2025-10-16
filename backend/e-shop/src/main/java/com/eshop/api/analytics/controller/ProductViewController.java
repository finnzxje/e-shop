package com.eshop.api.analytics.controller;

import com.eshop.api.analytics.dto.LinkSessionRequest;
import com.eshop.api.analytics.dto.ProductViewRequest;
import com.eshop.api.analytics.service.ProductInteractionLinkService;
import com.eshop.api.analytics.service.ProductViewService;
import com.eshop.api.exception.InvalidJwtException;
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
    private final ProductInteractionLinkService productInteractionLinkService;

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

    @PostMapping("/views/link-session")
    public ResponseEntity<Void> linkSession(
        @Valid @RequestBody LinkSessionRequest request,
        Authentication authentication
    ) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidJwtException("Authentication is required to link session data");
        }

        productInteractionLinkService.linkSessionToUser(request.sessionId(), authentication.getName());
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}

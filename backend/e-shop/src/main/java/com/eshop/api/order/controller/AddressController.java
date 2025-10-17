package com.eshop.api.order.controller;

import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.order.dto.AddressRequest;
import com.eshop.api.order.dto.AddressResponse;
import com.eshop.api.order.service.AddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/account/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @GetMapping
    public ResponseEntity<List<AddressResponse>> listAddresses(Authentication authentication) {
        String email = resolveEmail(authentication);
        return ResponseEntity.ok(addressService.listAddresses(email));
    }

    @GetMapping("/{addressId}")
    public ResponseEntity<AddressResponse> getAddress(
        @PathVariable("addressId") UUID addressId,
        Authentication authentication
    ) {
        String email = resolveEmail(authentication);
        return ResponseEntity.ok(addressService.getAddress(email, addressId));
    }

    @PostMapping
    public ResponseEntity<AddressResponse> createAddress(
        @Valid @RequestBody AddressRequest request,
        Authentication authentication
    ) {
        String email = resolveEmail(authentication);
        AddressResponse response = addressService.createAddress(email, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{addressId}")
    public ResponseEntity<AddressResponse> updateAddress(
        @PathVariable("addressId") UUID addressId,
        @Valid @RequestBody AddressRequest request,
        Authentication authentication
    ) {
        String email = resolveEmail(authentication);
        AddressResponse response = addressService.updateAddress(email, addressId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{addressId}")
    public ResponseEntity<Void> deleteAddress(
        @PathVariable("addressId") UUID addressId,
        Authentication authentication
    ) {
        String email = resolveEmail(authentication);
        addressService.deleteAddress(email, addressId);
        return ResponseEntity.noContent().build();
    }

    private String resolveEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidJwtException("Authentication is required for address operations");
        }
        return authentication.getName();
    }
}

package com.eshop.api.user.controller;

import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.user.dto.UserPasswordChangeRequest;
import com.eshop.api.user.dto.UserProfileResponse;
import com.eshop.api.user.dto.UserProfileUpdateRequest;
import com.eshop.api.user.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping
    public ResponseEntity<UserProfileResponse> getProfile(Authentication authentication) {
        String email = resolveEmail(authentication);
        return ResponseEntity.ok(userProfileService.getProfile(email));
    }

    @PutMapping
    public ResponseEntity<UserProfileResponse> updateProfile(
            @Valid @RequestBody UserProfileUpdateRequest request,
            Authentication authentication
    ) {
        String email = resolveEmail(authentication);
        return ResponseEntity.ok(userProfileService.updateProfile(email, request));
    }

    @PatchMapping("/password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody UserPasswordChangeRequest request,
            Authentication authentication
    ) {
        String email = resolveEmail(authentication);
        userProfileService.changePassword(email, request);
        return ResponseEntity.noContent().build();
    }

    private String resolveEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidJwtException("Authentication is required to manage the profile");
        }
        return authentication.getName();
    }
}

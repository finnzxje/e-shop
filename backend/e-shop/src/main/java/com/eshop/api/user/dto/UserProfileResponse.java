package com.eshop.api.user.dto;

import java.time.Instant;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String phone,
        Boolean enabled,
        Instant emailVerifiedAt,
        Instant createdAt,
        Instant updatedAt
) {
}

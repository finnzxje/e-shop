package com.eshop.api.user.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class AdminUserSummaryResponse {
    UUID id;
    String email;
    String firstName;
    String lastName;
    Boolean enabled;
    Instant createdAt;
    Instant updatedAt;
    List<String> roles;
}

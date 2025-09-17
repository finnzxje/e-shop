package com.eshop.api.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private Boolean enabled;
    private Instant createdAt;
}
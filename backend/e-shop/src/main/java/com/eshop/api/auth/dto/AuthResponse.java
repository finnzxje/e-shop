package com.eshop.api.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
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
    private String token;
    private List<String> roles;

    public AuthResponse(UUID id, String email, String firstName, String lastName, Boolean enabled, Instant createdAt, List<String> roles) {
        this.id = id;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.enabled = enabled;
        this.createdAt = createdAt;
        this.roles = roles;
    }
}
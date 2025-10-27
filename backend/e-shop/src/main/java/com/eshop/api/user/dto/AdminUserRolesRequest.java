package com.eshop.api.user.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record AdminUserRolesRequest(
    @NotNull(message = "Roles list is required")
    Set<String> roles
) {
}

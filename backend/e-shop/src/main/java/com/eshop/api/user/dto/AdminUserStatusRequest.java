package com.eshop.api.user.dto;

import jakarta.validation.constraints.NotNull;

public record AdminUserStatusRequest(
    @NotNull(message = "Enabled flag is required")
    Boolean enabled
) {
}

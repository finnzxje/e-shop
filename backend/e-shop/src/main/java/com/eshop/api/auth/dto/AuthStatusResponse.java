package com.eshop.api.auth.dto;

import java.util.List;

/**
 * Carries a minimal snapshot of the currently authenticated user so clients can
 * verify that their JWT is still accepted by the API.
 */
public record AuthStatusResponse(boolean authenticated, String username, List<String> roles) {
}

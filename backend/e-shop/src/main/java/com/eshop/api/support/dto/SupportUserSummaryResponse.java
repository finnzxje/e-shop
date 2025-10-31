package com.eshop.api.support.dto;

import java.util.UUID;

public record SupportUserSummaryResponse(
    UUID id,
    String email,
    String firstName,
    String lastName
) {
}

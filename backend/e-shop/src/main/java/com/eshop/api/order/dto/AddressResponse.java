package com.eshop.api.order.dto;

import java.time.Instant;
import java.util.UUID;

public record AddressResponse(
    UUID id,
    String label,
    String recipientName,
    String phone,
    String line1,
    String line2,
    String city,
    String stateProvince,
    String postalCode,
    String countryCode,
    Boolean isDefault,
    Instant createdAt,
    Instant updatedAt
) {
}

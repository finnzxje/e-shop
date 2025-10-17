package com.eshop.api.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddressRequest(
    @Size(max = 100, message = "Label must be 100 characters or fewer")
    String label,

    @NotBlank(message = "Recipient name is required")
    @Size(max = 150, message = "Recipient name must be 150 characters or fewer")
    String recipientName,

    @Size(max = 30, message = "Phone must be 30 characters or fewer")
    String phone,

    @NotBlank(message = "Address line 1 is required")
    @Size(max = 255, message = "Address line 1 must be 255 characters or fewer")
    String line1,

    @Size(max = 255, message = "Address line 2 must be 255 characters or fewer")
    String line2,

    @NotBlank(message = "City is required")
    @Size(max = 120, message = "City must be 120 characters or fewer")
    String city,

    @Size(max = 120, message = "State/Province must be 120 characters or fewer")
    String stateProvince,

    @Size(max = 32, message = "Postal code must be 32 characters or fewer")
    String postalCode,

    @NotBlank(message = "Country code is required")
    @Size(min = 2, max = 2, message = "Country code must be ISO-2 format")
    String countryCode,

    Boolean isDefault
) {
    public boolean makeDefault() {
        return Boolean.TRUE.equals(isDefault);
    }
}

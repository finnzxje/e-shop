package com.eshop.api.user.dto;

import com.eshop.api.order.dto.AddressResponse;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Value
@Builder
public class AdminUserDetailResponse {
    UUID id;
    String email;
    String firstName;
    String lastName;
    String phone;
    Boolean enabled;
    Instant emailVerifiedAt;
    Instant createdAt;
    Instant updatedAt;
    List<String> roles;
    List<AddressResponse> addresses;
}

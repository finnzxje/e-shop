package com.eshop.api.catalog.dto;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class ProductVariantStockAdjustmentResponse {
    UUID id;
    Integer previousQuantity;
    Integer newQuantity;
    Integer delta;
    String reason;
    String notes;
    Instant adjustedAt;
    AdjustedBy adjustedBy;

    @Value
    @Builder
    public static class AdjustedBy {
        UUID id;
        String email;
        String firstName;
        String lastName;
    }
}

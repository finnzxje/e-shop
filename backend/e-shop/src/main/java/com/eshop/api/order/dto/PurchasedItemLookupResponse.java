package com.eshop.api.order.dto;

import java.time.Instant;
import java.util.UUID;

public record PurchasedItemLookupResponse(
    UUID orderItemId,
    UUID orderId,
    String orderNumber,
    Instant purchasedAt,
    boolean verifiedPurchase
) {
}


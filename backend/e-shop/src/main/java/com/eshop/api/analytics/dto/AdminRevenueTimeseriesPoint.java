package com.eshop.api.analytics.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record AdminRevenueTimeseriesPoint(
    Instant bucketStart,
    Instant bucketEnd,
    long orderCount,
    BigDecimal gross,
    BigDecimal net,
    BigDecimal refunds
) {
}

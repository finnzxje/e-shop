package com.eshop.api.analytics.dto;

import java.math.BigDecimal;

public record AdminAnalyticsSummaryResponse(
    BigDecimal revenue,
    long orders,
    BigDecimal capturedPayments,
    long newCustomers,
    BigDecimal averageOrderValue,
    BigDecimal conversionRate
) {
}

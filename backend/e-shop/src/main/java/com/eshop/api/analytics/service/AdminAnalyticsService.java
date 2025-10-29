package com.eshop.api.analytics.service;

import com.eshop.api.analytics.dto.AdminAnalyticsSummaryResponse;
import com.eshop.api.analytics.repository.ProductViewRepository;
import com.eshop.api.exception.InvalidAnalyticsPeriodException;
import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.repository.OrderRepository;
import com.eshop.api.order.repository.PaymentTransactionRepository;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAnalyticsService {

    private static final Duration DEFAULT_PERIOD = Duration.ofDays(30);
    private static final Duration MAX_PERIOD = Duration.ofDays(365);
    private static final Pattern PERIOD_PATTERN = Pattern.compile("^(\\d+)([dDhH])$");

    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final UserRepository userRepository;
    private final ProductViewRepository productViewRepository;

    public AdminAnalyticsSummaryResponse getSummary(String rawPeriod) {
        Duration duration = parsePeriodOrDefault(rawPeriod);
        Instant end = Instant.now();
        Instant start = end.minus(duration);

        BigDecimal revenue = normalizeMoney(
            Optional.ofNullable(orderRepository.sumTotalAmountByPaymentStatusSince(PaymentStatus.CAPTURED, start))
                .orElse(BigDecimal.ZERO)
        );

        long orders = Optional.ofNullable(orderRepository.countOrdersPlacedSinceExcludingStatus(start, OrderStatus.CANCELLED))
            .orElse(0L);

        BigDecimal capturedPayments = normalizeMoney(
            Optional.ofNullable(paymentTransactionRepository.sumCapturedAmountByStatusSince(PaymentStatus.CAPTURED, start))
                .orElse(BigDecimal.ZERO)
        );

        long newCustomers = userRepository.countByCreatedAtGreaterThanEqual(start);
        long productViews = productViewRepository.countByViewedAtGreaterThanEqual(start);

        BigDecimal averageOrderValue = orders > 0
            ? revenue.divide(BigDecimal.valueOf(orders), 2, RoundingMode.HALF_UP)
            : normalizeMoney(BigDecimal.ZERO);

        BigDecimal conversionRate = calculateConversionRate(orders, productViews);

        return new AdminAnalyticsSummaryResponse(
            revenue,
            orders,
            capturedPayments,
            newCustomers,
            averageOrderValue,
            conversionRate
        );
    }

    private Duration parsePeriodOrDefault(String rawPeriod) {
        if (rawPeriod == null || rawPeriod.isBlank()) {
            return DEFAULT_PERIOD;
        }

        Matcher matcher = PERIOD_PATTERN.matcher(rawPeriod.trim());
        if (!matcher.matches()) {
            throw new InvalidAnalyticsPeriodException(rawPeriod);
        }

        long amount = Long.parseLong(matcher.group(1));
        if (amount <= 0) {
            throw new InvalidAnalyticsPeriodException(rawPeriod);
        }

        Duration duration = switch (matcher.group(2).toLowerCase()) {
            case "d" -> Duration.ofDays(amount);
            case "h" -> Duration.ofHours(amount);
            default -> throw new InvalidAnalyticsPeriodException(rawPeriod);
        };

        if (duration.compareTo(MAX_PERIOD) > 0) {
            throw new InvalidAnalyticsPeriodException(rawPeriod);
        }

        return duration;
    }

    private BigDecimal normalizeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateConversionRate(long orders, long productViews) {
        if (orders == 0 || productViews == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return BigDecimal.valueOf(orders)
            .multiply(BigDecimal.valueOf(100))
            .divide(BigDecimal.valueOf(productViews), 2, RoundingMode.HALF_UP);
    }
}

package com.eshop.api.analytics.service;

import com.eshop.api.analytics.dto.AdminAnalyticsSummaryResponse;
import com.eshop.api.analytics.dto.AdminRevenueTimeseriesPoint;
import com.eshop.api.analytics.repository.ProductViewRepository;
import com.eshop.api.exception.InvalidAnalyticsDateRangeException;
import com.eshop.api.exception.InvalidAnalyticsIntervalException;
import com.eshop.api.exception.InvalidAnalyticsPeriodException;
import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.repository.OrderRepository;
import com.eshop.api.order.repository.PaymentTransactionRepository;
import com.eshop.api.order.repository.projection.OrderRevenueBucketProjection;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Optional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAnalyticsService {

    private static final Duration DEFAULT_PERIOD = Duration.ofDays(30);
    private static final Duration MAX_PERIOD = Duration.ofDays(365);
    private static final Pattern PERIOD_PATTERN = Pattern.compile("^(\\d+)([dDhH])$");
    private static final ZoneId ANALYTICS_ZONE = ZoneId.systemDefault();

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

    public List<AdminRevenueTimeseriesPoint> getRevenueTimeseries(Instant start,
                                                                  Instant end,
                                                                  String rawInterval) {
        if (start == null || end == null || !start.isBefore(end)) {
            throw new InvalidAnalyticsDateRangeException();
        }

        TimeInterval interval = parseIntervalOrDefault(rawInterval);

        List<OrderRevenueBucketProjection> orderAggregates = orderRepository.aggregateCapturedRevenueByInterval(
            interval.pgTruncKey,
            start,
            end
        );

        Map<Instant, OrderRevenueBucketProjection> orderBuckets = new HashMap<>();
        for (OrderRevenueBucketProjection projection : orderAggregates) {
            orderBuckets.put(projection.getBucketStart(), projection);
        }

        List<AdminRevenueTimeseriesPoint> points = new ArrayList<>();
        Instant bucketStart = alignToInterval(start, interval);
        BigDecimal zeroMoney = normalizeMoney(BigDecimal.ZERO);

        while (bucketStart.isBefore(end)) {
            Instant bucketEnd = advance(bucketStart, interval);
            OrderRevenueBucketProjection orders = orderBuckets.get(bucketStart);

            long orderCount = orders != null && orders.getOrderCount() != null ? orders.getOrderCount() : 0L;
            BigDecimal gross = orders != null ? normalizeMoney(orders.getGrossTotal()) : zeroMoney;

            points.add(new AdminRevenueTimeseriesPoint(
                bucketStart,
                bucketEnd,
                orderCount,
                gross,
                gross,
                zeroMoney
            ));

            bucketStart = bucketEnd;
        }

        return points;
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

    private TimeInterval parseIntervalOrDefault(String rawInterval) {
        if (rawInterval == null || rawInterval.isBlank()) {
            return TimeInterval.DAILY;
        }

        return switch (rawInterval.trim().toLowerCase()) {
            case "daily" -> TimeInterval.DAILY;
            case "weekly" -> TimeInterval.WEEKLY;
            default -> throw new InvalidAnalyticsIntervalException(rawInterval);
        };
    }

    private Instant alignToInterval(Instant instant, TimeInterval interval) {
        ZonedDateTime zoned = instant.atZone(ANALYTICS_ZONE);
        return switch (interval) {
            case DAILY -> zoned.toLocalDate().atStartOfDay(ANALYTICS_ZONE).toInstant();
            case WEEKLY -> zoned.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .toLocalDate()
                .atStartOfDay(ANALYTICS_ZONE)
                .toInstant();
        };
    }

    private Instant advance(Instant instant, TimeInterval interval) {
        return instant.plus(interval.step);
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

    private enum TimeInterval {
        DAILY("day", Duration.ofDays(1)),
        WEEKLY("week", Duration.ofDays(7));

        private final String pgTruncKey;
        private final Duration step;

        TimeInterval(String pgTruncKey, Duration step) {
            this.pgTruncKey = pgTruncKey;
            this.step = step;
        }
    }
}

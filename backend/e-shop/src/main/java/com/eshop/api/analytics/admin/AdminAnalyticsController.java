package com.eshop.api.analytics.admin;

import com.eshop.api.analytics.dto.AdminAnalyticsSummaryResponse;
import com.eshop.api.analytics.dto.AdminRevenueTimeseriesPoint;
import com.eshop.api.analytics.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;

    @GetMapping("/summary")
    public ResponseEntity<AdminAnalyticsSummaryResponse> getSummary(
        @RequestParam(value = "period", required = false) String period
    ) {
        AdminAnalyticsSummaryResponse response = adminAnalyticsService.getSummary(period);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/revenue")
    public ResponseEntity<List<AdminRevenueTimeseriesPoint>> getRevenueTimeseries(
        @RequestParam("start") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant start,
        @RequestParam("end") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant end,
        @RequestParam(value = "interval", required = false, defaultValue = "daily") String interval
    ) {
        List<AdminRevenueTimeseriesPoint> response = adminAnalyticsService.getRevenueTimeseries(start, end, interval);
        return ResponseEntity.ok(response);
    }
}

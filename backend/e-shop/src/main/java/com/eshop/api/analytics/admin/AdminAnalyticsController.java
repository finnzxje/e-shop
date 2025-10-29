package com.eshop.api.analytics.admin;

import com.eshop.api.analytics.dto.AdminAnalyticsSummaryResponse;
import com.eshop.api.analytics.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}

package com.eshop.api.payment.vnpay;

import com.eshop.api.payment.dto.VnPayConfirmResponse;
import com.eshop.api.payment.service.VnPayCallbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payments/vnpay")
@RequiredArgsConstructor
public class VnPayController {

    private final VnPayCallbackService vnPayCallbackService;

    @PostMapping("/confirm")
    public ResponseEntity<VnPayConfirmResponse> confirmPayment(@RequestBody Map<String, String> payload) {
        VnPayConfirmResponse response = vnPayCallbackService.handleReturn(payload);
        return ResponseEntity.ok(response);
    }
}

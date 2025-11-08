package com.eshop.api.order.admin;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.order.dto.PaymentTransactionResponse;
import com.eshop.api.order.enums.PaymentMethod;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.service.AdminPaymentTransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminPaymentTransactionController {

    private final AdminPaymentTransactionService paymentTransactionService;

    @GetMapping("/payments/transactions")
    public ResponseEntity<PageResponse<PaymentTransactionResponse>> listTransactions(
        @RequestParam(value = "status", required = false) PaymentStatus status,
        @RequestParam(value = "method", required = false) PaymentMethod method,
        @RequestParam(value = "provider", required = false) String provider,
        @RequestParam(value = "orderNumber", required = false) String orderNumber,
        @RequestParam(value = "createdAfter", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdAfter,
        @RequestParam(value = "createdBefore", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant createdBefore,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        PageResponse<PaymentTransactionResponse> response = paymentTransactionService.listTransactions(
            status,
            method,
            provider,
            orderNumber,
            createdAfter,
            createdBefore,
            pageable
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/payments/transactions/{transactionId}")
    public ResponseEntity<PaymentTransactionResponse> getTransaction(@PathVariable("transactionId") UUID transactionId) {
        PaymentTransactionResponse response = paymentTransactionService.getTransaction(transactionId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/orders/{orderNumber}/transactions")
    public ResponseEntity<List<PaymentTransactionResponse>> listTransactionsForOrder(@PathVariable("orderNumber") String orderNumber) {
        List<PaymentTransactionResponse> response = paymentTransactionService.listTransactionsForOrder(orderNumber);
        return ResponseEntity.ok(response);
    }
}

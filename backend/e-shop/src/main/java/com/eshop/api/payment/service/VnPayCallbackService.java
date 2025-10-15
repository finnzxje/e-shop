package com.eshop.api.payment.service;

import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.exception.PaymentValidationException;
import com.eshop.api.order.model.Order;
import com.eshop.api.order.model.OrderStatusHistory;
import com.eshop.api.order.model.PaymentTransaction;
import com.eshop.api.order.repository.OrderRepository;
import com.eshop.api.order.repository.OrderStatusHistoryRepository;
import com.eshop.api.order.repository.PaymentTransactionRepository;
import com.eshop.api.payment.dto.VnPayConfirmResponse;
import com.eshop.api.payment.service.CurrencyConversionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class VnPayCallbackService {

    private static final String SUCCESS_CODE = "00";

    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final ObjectMapper objectMapper;
    private final CurrencyConversionService currencyConversionService;

    public VnPayConfirmResponse handleReturn(Map<String, String> payload) {
        if (payload == null || payload.isEmpty()) {
            throw new PaymentValidationException("VNPay payload is empty");
        }

        String orderNumber = payload.get("vnp_TxnRef");
        if (orderNumber == null || orderNumber.isBlank()) {
            throw new PaymentValidationException("Missing order reference in VNPay response");
        }

        Order order = orderRepository.findByOrderNumber(orderNumber)
            .orElseThrow(() -> new PaymentValidationException("Order not found: " + orderNumber));

        PaymentTransaction transaction = paymentTransactionRepository
            .findTopByOrder_OrderNumberOrderByCreatedAtDesc(orderNumber)
            .orElseThrow(() -> new PaymentValidationException("Payment transaction not found for order: " + orderNumber));

        boolean alreadyCaptured = transaction.getStatus() == PaymentStatus.CAPTURED;
        boolean alreadyFailed = transaction.getStatus() == PaymentStatus.FAILED;
        if (alreadyCaptured || alreadyFailed) {
            return VnPayConfirmResponse.builder()
                .orderNumber(orderNumber)
                .orderStatus(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .transactionStatus(transaction.getStatus())
                .alreadyProcessed(true)
                .build();
        }

        boolean success = SUCCESS_CODE.equals(payload.get("vnp_ResponseCode"))
            && SUCCESS_CODE.equals(payload.get("vnp_TransactionStatus"));

        ObjectNode rawResponse = objectMapper.valueToTree(payload);
        transaction.setRawResponse(rawResponse);
        transaction.setProviderTransactionId(payload.get("vnp_TransactionNo"));
        transaction.setErrorCode(null);
        transaction.setErrorMessage(null);

        if (success) {
            validateAmount(order, payload.get("vnp_Amount"));
            applySuccess(order, transaction);
            transaction.setCapturedAmount(order.getTotalAmount());
            log.info("VNPay payment captured for order {}", orderNumber);
        } else {
            applyFailure(order, transaction, payload.get("vnp_ResponseCode"), payload.get("vnp_TransactionStatus"));
            log.warn("VNPay payment failed for order {} with codes {}/{}", orderNumber,
                payload.get("vnp_ResponseCode"), payload.get("vnp_TransactionStatus"));
        }

        paymentTransactionRepository.save(transaction);
        orderRepository.save(order);

        OrderStatusHistory history = OrderStatusHistory.builder()
            .order(order)
            .status(order.getStatus())
            .paymentStatus(order.getPaymentStatus())
            .comment(success ? "VNPay payment captured" : "VNPay payment failed")
            .build();
        order.addStatusHistory(history);
        orderStatusHistoryRepository.save(history);

        return VnPayConfirmResponse.builder()
            .orderNumber(orderNumber)
            .orderStatus(order.getStatus())
            .paymentStatus(order.getPaymentStatus())
            .transactionStatus(transaction.getStatus())
            .alreadyProcessed(false)
            .build();
    }

    private void validateAmount(Order order, String amountRaw) {
        if (amountRaw == null || amountRaw.isBlank()) {
            throw new PaymentValidationException("VNPay amount is missing");
        }
/*        try {
            BigDecimal amountMinor = new BigDecimal(amountRaw);
            BigDecimal amountMajor = amountMinor.divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            log.info("VNPay amount major: {}, minor: {}", amountMajor, amountMinor);
            log.info("Total {}", order.getTotalAmount());
            if (order.getTotalAmount() == null || amountMajor.compareTo(order.getTotalAmount()) != 0) {
                throw new PaymentValidationException("VNPay amount does not match order total");
            }
        } catch (NumberFormatException ex) {
            throw new PaymentValidationException("VNPay amount is invalid");
        }*/
    }

    private void applySuccess(Order order, PaymentTransaction transaction) {
        transaction.setStatus(PaymentStatus.CAPTURED);
        transaction.setCapturedAmount(order.getTotalAmount());
        order.setPaymentStatus(PaymentStatus.CAPTURED);
        order.setPaidAt(Instant.now());
        if (order.getStatus() == OrderStatus.AWAITING_PAYMENT || order.getStatus() == OrderStatus.PENDING) {
            order.setStatus(OrderStatus.PROCESSING);
        }
    }

    private void applyFailure(Order order, PaymentTransaction transaction, String responseCode, String txnStatus) {
        transaction.setStatus(PaymentStatus.FAILED);
        transaction.setErrorCode(responseCode);
        transaction.setErrorMessage(txnStatus);
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setCancelledAt(Instant.now());
        order.setStatus(OrderStatus.CANCELLED);
    }
}

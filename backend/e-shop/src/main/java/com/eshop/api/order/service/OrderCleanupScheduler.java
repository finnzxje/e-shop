package com.eshop.api.order.service;

import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.model.Order;
import com.eshop.api.order.model.OrderStatusHistory;
import com.eshop.api.order.repository.OrderRepository;
import com.eshop.api.order.repository.OrderStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderCleanupScheduler {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final InventoryService inventoryService;

    @Value("${app.order.awaiting-payment-timeout-minutes:30}")
    private long awaitingPaymentTimeoutMinutes;

    @Scheduled(fixedDelayString = "${app.order.cleanup-interval-ms:300000}")
    @Transactional
    public void cancelStaleAwaitingPaymentOrders() {
        Instant cutoff = Instant.now().minus(awaitingPaymentTimeoutMinutes, ChronoUnit.MINUTES);
        List<Order> staleOrders = orderRepository.findByStatusAndPaymentStatusAndPlacedAtBefore(
            OrderStatus.AWAITING_PAYMENT,
            PaymentStatus.PENDING,
            cutoff
        );

        if (staleOrders.isEmpty()) {
            return;
        }

        log.info("Cancelling {} stale awaiting-payment orders older than {}", staleOrders.size(), cutoff);

        Instant now = Instant.now();
        for (Order order : staleOrders) {
            inventoryService.releaseOrderItems(order.getItems());
            order.setStatus(OrderStatus.CANCELLED);
            order.setPaymentStatus(PaymentStatus.FAILED);
            order.setCancelledAt(now);

            orderRepository.save(order);

            OrderStatusHistory history = OrderStatusHistory.builder()
                .order(order)
                .status(order.getStatus())
                .paymentStatus(order.getPaymentStatus())
                .comment("Order cancelled due to payment timeout")
                .changedBy(order.getUser())
                .build();

            order.addStatusHistory(history);
            orderStatusHistoryRepository.save(history);
        }
    }
}

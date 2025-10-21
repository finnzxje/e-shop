package com.eshop.api.order.service;

import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.order.dto.OrderStatusResponse;
import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.exception.InvalidOrderStateException;
import com.eshop.api.order.exception.OrderNotFoundException;
import com.eshop.api.order.model.Order;
import com.eshop.api.order.model.OrderStatusHistory;
import com.eshop.api.order.repository.OrderRepository;
import com.eshop.api.order.repository.OrderStatusHistoryRepository;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderLifecycleService {

    private final OrderRepository orderRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final UserRepository userRepository;

    @Transactional
    public OrderStatusResponse confirmFulfillment(String email, UUID orderId) {
        User user = resolveUser(email);
        Order order = orderRepository.findByIdAndUser_Id(orderId, user.getId())
            .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getPaymentStatus() != PaymentStatus.CAPTURED) {
            throw new InvalidOrderStateException(order.getStatus(), "confirmed as fulfilled before payment capture");
        }

        if (order.getStatus() == OrderStatus.FULFILLED) {
            return toResponse(order);
        }

        if (order.getStatus() != OrderStatus.PROCESSING && order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            throw new InvalidOrderStateException(order.getStatus(), "confirmed as fulfilled");
        }

        Instant now = Instant.now();
        order.setStatus(OrderStatus.FULFILLED);
        order.setFulfilledAt(now);

        orderRepository.save(order);

        OrderStatusHistory history = OrderStatusHistory.builder()
            .order(order)
            .status(order.getStatus())
            .paymentStatus(order.getPaymentStatus())
            .comment("Customer confirmed delivery")
            .changedBy(user)
            .build();

        order.addStatusHistory(history);
        orderStatusHistoryRepository.save(history);

        log.info("User {} confirmed fulfillment for order {}", user.getId(), orderId);

        return toResponse(order);
    }

    private OrderStatusResponse toResponse(Order order) {
        return OrderStatusResponse.builder()
            .orderId(order.getId())
            .orderNumber(order.getOrderNumber())
            .orderStatus(order.getStatus())
            .paymentStatus(order.getPaymentStatus())
            .paidAt(order.getPaidAt())
            .fulfilledAt(order.getFulfilledAt())
            .build();
    }

    private User resolveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new InvalidJwtException("Authentication is required to manage orders");
        }
        return userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}

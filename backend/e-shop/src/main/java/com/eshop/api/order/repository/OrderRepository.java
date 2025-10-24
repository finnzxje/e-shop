package com.eshop.api.order.repository;

import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByOrderNumber(String orderNumber);

    Optional<Order> findByIdAndUser_Id(UUID orderId, UUID userId);

    List<Order> findByStatusAndPaymentStatusAndPlacedAtBefore(OrderStatus status,
                                                             PaymentStatus paymentStatus,
                                                             Instant placedAtBefore);

    Page<Order> findByUser_IdOrderByPlacedAtDesc(UUID userId, Pageable pageable);
}

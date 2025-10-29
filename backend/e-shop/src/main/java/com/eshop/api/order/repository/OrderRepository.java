package com.eshop.api.order.repository;

import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.model.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    Optional<Order> findByOrderNumber(String orderNumber);

    Optional<Order> findByIdAndUser_Id(UUID orderId, UUID userId);

    List<Order> findByStatusAndPaymentStatusAndPlacedAtBefore(OrderStatus status,
                                                             PaymentStatus paymentStatus,
                                                             Instant placedAtBefore);

    Page<Order> findByUser_IdOrderByPlacedAtDesc(UUID userId, Pageable pageable);

    @Query("""
        SELECT SUM(o.totalAmount)
        FROM Order o
        WHERE o.paymentStatus = :paymentStatus
          AND o.placedAt >= :start
    """)
    BigDecimal sumTotalAmountByPaymentStatusSince(@Param("paymentStatus") PaymentStatus paymentStatus,
                                                  @Param("start") Instant start);

    @Query("""
        SELECT COUNT(o)
        FROM Order o
        WHERE o.placedAt >= :start
          AND o.status <> :excludedStatus
    """)
    Long countOrdersPlacedSinceExcludingStatus(@Param("start") Instant start,
                                               @Param("excludedStatus") OrderStatus excludedStatus);
}

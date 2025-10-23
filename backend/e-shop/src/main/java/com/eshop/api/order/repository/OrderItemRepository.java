package com.eshop.api.order.repository;

import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.model.OrderItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

    @Query("SELECT oi FROM OrderItem oi " +
           "WHERE oi.order.user.id = :userId " +
           "AND oi.order.paymentStatus = :paymentStatus " +
           "ORDER BY oi.order.paidAt DESC NULLS LAST, oi.createdAt DESC")
    Page<OrderItem> findPurchasedItemsByUser(@Param("userId") UUID userId,
                                             @Param("paymentStatus") PaymentStatus paymentStatus,
                                             Pageable pageable);

    @Query("SELECT oi FROM OrderItem oi " +
           "WHERE oi.order.user.id = :userId " +
           "AND oi.product.id = :productId " +
           "AND oi.order.paymentStatus = :paymentStatus " +
           "ORDER BY oi.order.paidAt DESC NULLS LAST, oi.createdAt DESC LIMIT 1")
    Optional<OrderItem> findLatestPurchasedItemByUserAndProduct(@Param("userId") UUID userId,
                                                                @Param("productId") UUID productId,
                                                                @Param("paymentStatus") PaymentStatus paymentStatus);
}

package com.eshop.api.order.repository;

import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.model.PaymentTransaction;
import com.eshop.api.order.repository.projection.PaymentRefundBucketProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID>, JpaSpecificationExecutor<PaymentTransaction> {

    Optional<PaymentTransaction> findByIdempotencyKey(String idempotencyKey);

    Optional<PaymentTransaction> findTopByOrder_OrderNumberOrderByCreatedAtDesc(String orderNumber);

    java.util.List<PaymentTransaction> findByOrder_OrderNumberOrderByCreatedAtDesc(String orderNumber);

    @Query("""
        SELECT SUM(COALESCE(pt.capturedAmount, pt.amount))
        FROM PaymentTransaction pt
        WHERE pt.status = :status
          AND pt.createdAt >= :start
    """)
    BigDecimal sumCapturedAmountByStatusSince(@Param("status") PaymentStatus status,
                                              @Param("start") Instant start);

    @Query(
        value = """
            SELECT date_trunc(:interval, pt.created_at) AS bucket_start,
                   COALESCE(SUM(COALESCE(pt.captured_amount, pt.amount)), 0) AS refund_total
            FROM payment_transactions pt
            WHERE pt.created_at >= :start AND pt.created_at < :end
              AND pt.status = 'VOIDED'
            GROUP BY bucket_start
            ORDER BY bucket_start
        """,
        nativeQuery = true
    )
    List<PaymentRefundBucketProjection> aggregateRefundsByInterval(@Param("interval") String interval,
                                                                   @Param("start") Instant start,
                                                                   @Param("end") Instant end);
}

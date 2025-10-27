package com.eshop.api.order.repository;

import com.eshop.api.order.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID>, JpaSpecificationExecutor<PaymentTransaction> {

    Optional<PaymentTransaction> findByIdempotencyKey(String idempotencyKey);

    Optional<PaymentTransaction> findTopByOrder_OrderNumberOrderByCreatedAtDesc(String orderNumber);

    java.util.List<PaymentTransaction> findByOrder_OrderNumberOrderByCreatedAtDesc(String orderNumber);
}

package com.eshop.api.order.service;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.exception.PaymentTransactionNotFoundException;
import com.eshop.api.order.dto.PaymentTransactionResponse;
import com.eshop.api.order.enums.PaymentMethod;
import com.eshop.api.order.enums.PaymentStatus;
import com.eshop.api.order.model.PaymentTransaction;
import com.eshop.api.order.repository.PaymentTransactionRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminPaymentTransactionService {

    private final PaymentTransactionRepository paymentTransactionRepository;

    public PageResponse<PaymentTransactionResponse> listTransactions(PaymentStatus status,
                                                                     PaymentMethod method,
                                                                     String provider,
                                                                     String orderNumber,
                                                                     Instant createdAfter,
                                                                     Instant createdBefore,
                                                                     Pageable pageable) {
        Specification<PaymentTransaction> specification = buildSpecification(status, method, provider, orderNumber, createdAfter, createdBefore);
        Page<PaymentTransaction> page = paymentTransactionRepository.findAll(specification, pageable);
        List<PaymentTransactionResponse> content = page.stream()
            .map(this::toResponse)
            .toList();

        return PageResponse.<PaymentTransactionResponse>builder()
            .content(content)
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .page(page.getNumber())
            .size(page.getSize())
            .hasNext(page.hasNext())
            .hasPrevious(page.hasPrevious())
            .build();
    }

    public List<PaymentTransactionResponse> listTransactionsForOrder(String orderNumber) {
        return paymentTransactionRepository.findByOrder_OrderNumberOrderByCreatedAtDesc(orderNumber).stream()
            .map(this::toResponse)
            .toList();
    }

    public PaymentTransactionResponse getTransaction(UUID transactionId) {
        PaymentTransaction transaction = paymentTransactionRepository.findById(transactionId)
            .orElseThrow(() -> new PaymentTransactionNotFoundException(transactionId));
        return toResponse(transaction);
    }

    private Specification<PaymentTransaction> buildSpecification(PaymentStatus status,
                                                                  PaymentMethod method,
                                                                  String provider,
                                                                  String orderNumber,
                                                                  Instant createdAfter,
                                                                  Instant createdBefore) {
        return (root, query, cb) -> {
            Predicate predicate = cb.conjunction();

            if (status != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            }

            if (method != null) {
                predicate = cb.and(predicate, cb.equal(root.get("method"), method));
            }

            if (provider != null && !provider.isBlank()) {
                predicate = cb.and(predicate, cb.like(cb.lower(root.get("provider")), "%" + provider.toLowerCase() + "%"));
            }

            if (orderNumber != null && !orderNumber.isBlank()) {
                predicate = cb.and(predicate, cb.equal(root.get("order").get("orderNumber"), orderNumber));
            }

            if (createdAfter != null) {
                predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("createdAt"), createdAfter));
            }

            if (createdBefore != null) {
                predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("createdAt"), createdBefore));
            }

            return predicate;
        };
    }

    private PaymentTransactionResponse toResponse(PaymentTransaction transaction) {
        return PaymentTransactionResponse.builder()
            .id(transaction.getId())
            .orderId(transaction.getOrder() != null ? transaction.getOrder().getId() : null)
            .orderNumber(transaction.getOrder() != null ? transaction.getOrder().getOrderNumber() : null)
            .provider(transaction.getProvider())
            .providerTransactionId(transaction.getProviderTransactionId())
            .idempotencyKey(transaction.getIdempotencyKey())
            .amount(transaction.getAmount())
            .currency(transaction.getCurrency())
            .status(transaction.getStatus())
            .method(transaction.getMethod())
            .capturedAmount(transaction.getCapturedAmount())
            .rawResponse(transaction.getRawResponse())
            .errorCode(transaction.getErrorCode())
            .errorMessage(transaction.getErrorMessage())
            .createdAt(transaction.getCreatedAt())
            .updatedAt(transaction.getUpdatedAt())
            .build();
    }
}

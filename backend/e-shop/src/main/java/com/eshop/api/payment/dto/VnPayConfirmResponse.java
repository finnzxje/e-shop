package com.eshop.api.payment.dto;

import com.eshop.api.order.enums.OrderStatus;
import com.eshop.api.order.enums.PaymentStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class VnPayConfirmResponse {
    private final String orderNumber;
    private final OrderStatus orderStatus;
    private final PaymentStatus paymentStatus;
    private final PaymentStatus transactionStatus;
    private final boolean alreadyProcessed;
}

package com.eshop.api.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class CheckoutRequest {

    private UUID addressId;

    @Valid
    private CheckoutAddressRequest address;

    private boolean saveAddress;

    @DecimalMin(value = "0.00", message = "Shipping amount must be greater than or equal to 0")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal shippingAmount;

    @DecimalMin(value = "0.00", message = "Discount amount must be greater than or equal to 0")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal discountAmount;

    @DecimalMin(value = "0.00", message = "Tax amount must be greater than or equal to 0")
    @Digits(integer = 10, fraction = 2)
    private BigDecimal taxAmount;

    @Size(max = 64, message = "Shipping method must be 64 characters or fewer")
    private String shippingMethod;

    @Size(max = 2048, message = "Notes must be 2048 characters or fewer")
    private String notes;
}

package com.eshop.api.payment.service;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class CurrencyConversionService {

    private static final BigDecimal USD_TO_VND_RATE = new BigDecimal("26355.53");
    private static final int SCALE = 2;

    public BigDecimal usdToVnd(BigDecimal usdAmount) {
        if (usdAmount == null) {
            return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
        }
        return usdAmount.multiply(USD_TO_VND_RATE).setScale(SCALE, RoundingMode.HALF_UP);
    }

    public String toMinorUnitString(BigDecimal amount) {
        if (amount == null) {
            return "0";
        }
        BigDecimal scaled = amount.multiply(BigDecimal.valueOf(100));
        return scaled.setScale(0, RoundingMode.DOWN).toPlainString();
    }
}

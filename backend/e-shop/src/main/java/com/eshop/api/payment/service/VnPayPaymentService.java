package com.eshop.api.payment.service;

import com.eshop.api.config.AppEnv;
import com.eshop.api.order.exception.PaymentInitializationException;
import com.eshop.api.order.model.Order;
import com.eshop.api.order.model.PaymentTransaction;
import com.eshop.api.payment.dto.VnPayInitResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class VnPayPaymentService {

    private static final DateTimeFormatter TIMESTAMP_FORMAT =
        DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final AppEnv appEnv;
    private final CurrencyConversionService currencyConversionService;

    public VnPayInitResponse createPaymentUrl(Order order, PaymentTransaction transaction, String clientIp) {
        AppEnv.Payment paymentConfig = requirePaymentConfig();
        AppEnv.Payment.Vnpay vnpay = requireVnPayConfig(paymentConfig);

        ensureConfigValue(vnpay.getTmnCode(), "tmn-code");
        ensureConfigValue(vnpay.getHashSecret(), "hash-secret");
        ensureConfigValue(vnpay.getApiUrl(), "api-url");
        ensureConfigValue(vnpay.getReturnUrl(), "return-url");

        BigDecimal totalVnd = currencyConversionService.usdToVnd(order.getTotalAmount());
        String amountMinorUnit = currencyConversionService.toMinorUnitString(totalVnd);

        Instant now = Instant.now();
        Instant expiry = now.plus(Duration.ofMinutes(vnpay.getExpireAfterMinutes()));

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", Objects.requireNonNullElse(vnpay.getVersion(), "2.1.0"));
        params.put("vnp_Command", Objects.requireNonNullElse(vnpay.getCommand(), "pay"));
        params.put("vnp_TmnCode", vnpay.getTmnCode());
        params.put("vnp_Amount", amountMinorUnit);
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", Objects.requireNonNullElse(transaction.getIdempotencyKey(), order.getOrderNumber()));
        params.put("vnp_OrderInfo", buildOrderInfo(vnpay, order));
        params.put("vnp_OrderType", Objects.requireNonNullElse(vnpay.getOrderType(), "other"));
        params.put("vnp_Locale", Objects.requireNonNullElse(vnpay.getLocale(), "vn"));
        params.put("vnp_ReturnUrl", vnpay.getReturnUrl());
/*        if (vnpay.getIpnUrl() != null && !vnpay.getIpnUrl().isBlank()) {
            params.put("vnp_IpnUrl", vnpay.getIpnUrl());
        }*/
        params.put("vnp_IpAddr", clientIp == null || clientIp.isBlank() ? "0.0.0.0" : clientIp);
        params.put("vnp_CreateDate", TIMESTAMP_FORMAT.format(now));
        params.put("vnp_ExpireDate", TIMESTAMP_FORMAT.format(expiry));

        String queryString = buildQueryString(params, true);
        String hashData = buildQueryString(params, false);
        String secureHash = hmacSHA512(vnpay.getHashSecret(), hashData);
        if (secureHash == null || secureHash.isBlank()) {
            throw new PaymentInitializationException("Unable to compute VNPay secure hash");
        }

        String paymentUrl = vnpay.getApiUrl() + "?" + queryString + "&vnp_SecureHash=" + secureHash;
        return VnPayInitResponse.builder()
            .paymentUrl(paymentUrl)
            .expiresAt(expiry)
            .amountVnd(totalVnd)
            .build();
    }

    private String buildOrderInfo(AppEnv.Payment.Vnpay vnpay, Order order) {
        String prefix = Objects.requireNonNullElse(vnpay.getOrderInfoPrefix(), "E-Shop Order");
        return prefix + " " + order.getOrderNumber();
    }

    private AppEnv.Payment requirePaymentConfig() {
        AppEnv.Payment payment = appEnv.getPayment();
        if (payment == null) {
            throw new PaymentInitializationException("Payment configuration is missing");
        }
        return payment;
    }

    private AppEnv.Payment.Vnpay requireVnPayConfig(AppEnv.Payment payment) {
        AppEnv.Payment.Vnpay vnpay = payment.getVnpay();
        if (vnpay == null) {
            throw new PaymentInitializationException("VNPay configuration is missing");
        }
        return vnpay;
    }

    private void ensureConfigValue(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new PaymentInitializationException("VNPay configuration " + name + " must be provided");
        }
    }

    private String buildQueryString(Map<String, String> params, boolean urlEncodeKeys) {
        StringBuilder builder = new StringBuilder();
        boolean first = true;
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isBlank()) {
                continue;
            }
            if (!first) {
                builder.append('&');
            }
            String key = urlEncodeKeys
                ? URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII)
                : entry.getKey();
            builder.append(key)
                .append('=')
                .append(URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII));
            first = false;
        }
        return builder.toString();
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(2 * rawHmac.length);
            for (byte b : rawHmac) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            log.error("Failed to compute VNPay HMAC", ex);
            throw new PaymentInitializationException("Failed to compute VNPay secure hash", ex);
        }
    }
}

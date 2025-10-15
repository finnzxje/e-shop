package com.eshop.api.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppEnv {

    private String baseURL;
    private Jwt jwt;
    private Payment payment;

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private long accessExpirationSeconds;
        private long refreshExpirationSeconds;
    }

    @Getter
    @Setter
    public static class Payment {
        private Vnpay vnpay = new Vnpay();

        @Getter
        @Setter
        public static class Vnpay {
            private String version = "2.1.0";
            private String command = "pay";
            private String tmnCode;
            private String hashSecret;
            private String apiUrl;
            private String returnUrl;
            private String ipnUrl;
            private String locale = "vn";
            private String orderType = "other";
            private String orderInfoPrefix = "E-Shop Order";
            private long expireAfterMinutes = 15;
        }
    }
}

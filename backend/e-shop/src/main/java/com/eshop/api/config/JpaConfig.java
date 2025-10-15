package com.eshop.api.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EntityScan(basePackages = {"com.eshop.api.user", "com.eshop.api.catalog", "com.eshop.api.cart", "com.eshop.api.order"})
@EnableJpaRepositories(basePackages = {"com.eshop.api.user", "com.eshop.api.catalog", "com.eshop.api.cart", "com.eshop.api.order"})
public class JpaConfig {
}

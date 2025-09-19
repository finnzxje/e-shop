package com.eshop.api.config;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EntityScan(basePackages = "com.eshop.api.user")
@EnableJpaRepositories(basePackages = "com.eshop.api.user")
public class JpaConfig {
}
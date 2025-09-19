package com.eshop.api.config;

import com.eshop.api.user.Role;
import com.eshop.api.user.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InitialDataLoader implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) throws Exception {
        // Create default roles if they don't exist
        if (!roleRepository.existsByName("ADMIN")) {
            Role adminRole = Role.builder()
                    .name("ADMIN")
                    .description("Administrator role with full access")
                    .build();
            roleRepository.save(adminRole);
            log.info("Created ADMIN role");
        }

        if (!roleRepository.existsByName("CUSTOMER")) {
            Role customerRole = Role.builder()
                    .name("CUSTOMER")
                    .description("Customer role with limited access")
                    .build();
            roleRepository.save(customerRole);
            log.info("Created CUSTOMER role");
        }
    }
}
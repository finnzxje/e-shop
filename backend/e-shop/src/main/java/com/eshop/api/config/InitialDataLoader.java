package com.eshop.api.config;

import com.eshop.api.user.Role;
import com.eshop.api.user.RoleRepository;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class InitialDataLoader implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        Role adminRole = ensureRole("ADMIN", "Administrator role with full access");
        Role customerRole = ensureRole("CUSTOMER", "Customer role with limited access");
        ensureRole("STAFF", "Staff role with access to product and order management");

        bootstrapAdminUser(adminRole);
        bootstrapDemoCustomer(customerRole);
    }

    private void bootstrapAdminUser(Role adminRole) {
        final String adminEmail = "admin@gmail.com";

        if (userRepository.existsByEmailIgnoreCase(adminEmail)) {
            return;
        }

        User adminUser = User.builder()
            .email(adminEmail)
            .passwordHash(passwordEncoder.encode("123456"))
            .firstName("Admin")
            .lastName("User")
            .enabled(true)
            .roles(new HashSet<>(Set.of(adminRole)))
            .build();

        userRepository.save(adminUser);
        log.info("Created default admin user with email {}", adminEmail);
    }

    private void bootstrapDemoCustomer(Role customerRole) {
        final String demoEmail = "demo.customer@eshop.local";

        if (userRepository.existsByEmailIgnoreCase(demoEmail)) {
            return;
        }

        User demoUser = User.builder()
            .email(demoEmail)
            .passwordHash(passwordEncoder.encode("123456"))
            .firstName("Demo")
            .lastName("Customer")
            .enabled(true)
            .emailVerifiedAt(Instant.now())
            .roles(new HashSet<>(Set.of(customerRole)))
            .build();

        userRepository.save(demoUser);
        log.info("Created default demo customer with email {}", demoEmail);
    }

    private Role ensureRole(String name, String description) {
        return roleRepository.findByName(name)
            .orElseGet(() -> {
                Role created = Role.builder()
                    .name(name)
                    .description(description)
                    .build();
                roleRepository.save(created);
                log.info("Created {} role", name);
                return created;
            });
    }
}

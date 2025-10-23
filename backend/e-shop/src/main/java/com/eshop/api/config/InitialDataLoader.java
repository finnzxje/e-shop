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
        Role adminRole = roleRepository.findByName("ADMIN")
            .orElseGet(() -> {
                Role created = Role.builder()
                    .name("ADMIN")
                    .description("Administrator role with full access")
                    .build();
                roleRepository.save(created);
                log.info("Created ADMIN role");
                return created;
            });

        roleRepository.findByName("CUSTOMER")
            .orElseGet(() -> {
                Role created = Role.builder()
                    .name("CUSTOMER")
                    .description("Customer role with limited access")
                    .build();
                roleRepository.save(created);
                log.info("Created CUSTOMER role");
                return created;
            });

        bootstrapAdminUser(adminRole);
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
}

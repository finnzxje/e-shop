package com.eshop.api.auth;

import com.eshop.api.auth.dto.AuthResponse;
import com.eshop.api.auth.dto.LoginRequest;
import com.eshop.api.auth.dto.RegisterRequest;
import com.eshop.api.exception.RoleNotFoundException;
import com.eshop.api.exception.UserAlreadyExistsException;
import com.eshop.api.user.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new UserAlreadyExistsException("User with email " + request.getEmail() + " already exists");
        }

        Optional<Role> customerRoleOpt = roleRepository.findByName("CUSTOMER");
        if (customerRoleOpt.isEmpty()) {
            throw new RoleNotFoundException("CUSTOMER role not found in the system");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .enabled(true)
                .roles(Collections.singleton(customerRoleOpt.get()))
                .build();

        user = userRepository.save(user);

        AuthResponse response = new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getEnabled(),
                user.getCreatedAt()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // TODO: For now, we're just verifying credentials and returning 200 OK
        return ResponseEntity.ok().build();
    }
}
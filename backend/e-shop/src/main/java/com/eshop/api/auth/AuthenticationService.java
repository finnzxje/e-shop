package com.eshop.api.auth;

import com.eshop.api.auth.dto.AuthResponse;
import com.eshop.api.auth.dto.LoginRequest;
import com.eshop.api.auth.dto.RegisterRequest;
import com.eshop.api.exception.RoleNotFoundException;
import com.eshop.api.exception.UserAlreadyExistsException;
import com.eshop.api.security.JwtService;
import com.eshop.api.security.TokenPayload;
import com.eshop.api.user.Role;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import com.eshop.api.user.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        log.info("Registering new user with email: {}", request.getEmail());

        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new UserAlreadyExistsException("User with email " + request.getEmail() + " already exists");
        }

        Optional<Role> customerRoleOpt = roleRepository.findByName("CUSTOMER");
        if (customerRoleOpt.isEmpty()) {
            throw new RoleNotFoundException("CUSTOMER role not found in the system");
        }

        User user = User.builder().email(request.getEmail()).passwordHash(passwordEncoder.encode(request.getPassword())).firstName(
                request.getFirstName()).lastName(request.getLastName()).enabled(true).roles(Collections.singleton(
                customerRoleOpt.get())).build();

        user = userRepository.save(user);

        log.info("Successfully registered user with ID: {}", user.getId());

        return new AuthResponse(user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getEnabled(),
                user.getCreatedAt(),
                user.getRoles().stream().map(Role::getName).collect(Collectors.toList()));
    }

    public AuthResponse login(LoginRequest request) {
        log.info("Authenticating user: {}", request.getEmail());

        Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()));

        if (!authentication.isAuthenticated()) {
            throw new BadCredentialsException("Invalid credentials");
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userRepository.findByEmailIgnoreCase(request.getEmail()).orElseThrow(() -> new RuntimeException(
                "User not found"));

        List<String> roles = user.getRoles().stream().map(Role::getName).collect(Collectors.toList());

        TokenPayload tokenPayload = TokenPayload.create().setSubject(user.getEmail()).setIssuedAt(Date.from(Instant.now())).setExpiration(
                        Date.from(Instant.now().plusSeconds(86400)))
                .roles(roles).build();

        String token = jwtService.generateAccessToken(tokenPayload);

        log.info("Successfully authenticated user: {}", user.getEmail());

        return new AuthResponse(user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getEnabled(),
                user.getCreatedAt(),
                token,
                roles);
    }
}
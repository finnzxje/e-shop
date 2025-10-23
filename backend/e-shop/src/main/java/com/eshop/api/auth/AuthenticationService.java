package com.eshop.api.auth;

import com.eshop.api.auth.dto.AuthResponse;
import com.eshop.api.auth.dto.LoginRequest;
import com.eshop.api.auth.dto.RegisterRequest;
import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.exception.RoleNotFoundException;
import com.eshop.api.exception.UserAlreadyExistsException;
import com.eshop.api.security.JwtService;
import com.eshop.api.user.Role;
import com.eshop.api.user.RoleRepository;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

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
                getRoleNames(user));
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

        List<String> roles = getRoleNames(user);

        String accessToken = jwtService.generateAccessToken(user.getEmail(), roles);
        String refreshToken = jwtService.generateRefreshToken(user.getEmail(), roles);

        log.info("Successfully authenticated user: {}", user.getEmail());

        return buildAuthResponse(user, accessToken, refreshToken, roles);
    }

    public AuthResponse refresh(String refreshToken) {
        log.info("Refreshing tokens");

        try {
            var claims = jwtService.extractClaimsOrThrow(refreshToken);
            if (!jwtService.isRefreshToken(claims)) {
                throw new InvalidJwtException("Provided token is not a refresh token");
            }

            String email = jwtService.getUsername(claims);
            User user = userRepository.findByEmailIgnoreCase(email)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found for refresh token"));

            List<String> roles = getRoleNames(user);
            String newAccessToken = jwtService.generateAccessToken(email, roles);
            String newRefreshToken = jwtService.generateRefreshToken(email, roles);

            return buildAuthResponse(user, newAccessToken, newRefreshToken, roles);
        } catch (InvalidJwtException e) {
            log.error("Failed to refresh token: {}", e.getMessage());
            throw e;
        }
    }

    public AuthResponse getCurrentUser(String email) {
        log.info("Fetching current authenticated user profile for email: {}", email);

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new InvalidJwtException("Authenticated user could not be resolved"));

        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getEnabled(),
                user.getCreatedAt(),
                getRoleNames(user)
        );
    }

    private List<String> getRoleNames(User user) {
        return user.getRoles().stream().map(Role::getName).toList();
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken, List<String> roles) {
        return new AuthResponse(user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getEnabled(),
                user.getCreatedAt(),
                accessToken,
                refreshToken,
                roles);
    }
}

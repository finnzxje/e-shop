package com.eshop.api.auth;

import com.eshop.api.auth.dto.PasswordResetConfirmRequest;
import com.eshop.api.auth.dto.PasswordResetRequest;
import com.eshop.api.email.EmailService;
import com.eshop.api.exception.InvalidPasswordChangeException;
import com.eshop.api.exception.InvalidPasswordResetTokenException;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.auth.password-reset.token-expiration-minutes:15}")
    private long tokenExpirationMinutes;

    public void requestPasswordReset(PasswordResetRequest request) {
        String email = request.email();

        Optional<User> userOptional = userRepository.findByEmailIgnoreCase(email);

        if (userOptional.isEmpty()) {
            log.info("Password reset requested for non-existent email: {}", email);
            return;
        }

        User user = userOptional.get();

        passwordResetTokenRepository.deleteAllByUser(user);

        String tokenValue = generateToken();
        Instant expiresAt = Instant.now().plus(tokenExpirationMinutes, ChronoUnit.MINUTES);

        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .token(tokenValue)
                .expiresAt(expiresAt)
                .build();

        passwordResetTokenRepository.save(token);

        emailService.sendPasswordResetToken(user, tokenValue);
        log.info("Password reset token issued for user {}", user.getEmail());
    }

    public void confirmPasswordReset(PasswordResetConfirmRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new InvalidPasswordResetTokenException("Invalid password reset token."));

        PasswordResetToken token = passwordResetTokenRepository.findByUserAndToken(user, request.token())
                .orElseThrow(() -> new InvalidPasswordResetTokenException("Invalid password reset token."));

        Instant now = Instant.now();

        if (token.isConsumed()) {
            throw new InvalidPasswordResetTokenException("Password reset token has already been used.");
        }

        if (token.isExpired(now)) {
            passwordResetTokenRepository.delete(token);
            throw new InvalidPasswordResetTokenException("Password reset token has expired.");
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new InvalidPasswordChangeException("New password must be different from the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        token.setConsumedAt(now);
        passwordResetTokenRepository.save(token);

        log.info("Password successfully reset for user {}", user.getEmail());
    }

    private String generateToken() {
        int value = secureRandom.nextInt(10000);
        return String.format("%04d", value);
    }
}

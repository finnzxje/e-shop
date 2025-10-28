package com.eshop.api.auth;

import com.eshop.api.email.EmailService;
import com.eshop.api.exception.InvalidActivationTokenException;
import com.eshop.api.exception.UserAlreadyActivatedException;
import com.eshop.api.exception.UserNotFoundException;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountActivationService {

    private final EmailVerificationTokenRepository tokenRepository;
    private final EmailService emailService;
    private final UserRepository userRepository;
    @Value("${app.auth.activation.base-url:http://localhost:8080/api/auth/activate}")
    private String activationBaseUrl;

    @Value("${app.auth.activation.token-expiration-minutes:1440}")
    private long tokenExpirationMinutes;

    public void sendActivationToken(User user) {
        tokenRepository.deleteAllByUser(user);

        String tokenValue = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(tokenExpirationMinutes, ChronoUnit.MINUTES);

        EmailVerificationToken verificationToken = EmailVerificationToken.builder()
                .user(user)
                .token(tokenValue)
                .expiresAt(expiresAt)
                .build();

        tokenRepository.save(verificationToken);

        String activationLink = UriComponentsBuilder.fromUriString(activationBaseUrl)
                .queryParam("token", tokenValue)
                .build()
                .toUriString();

        emailService.sendAccountActivationEmail(user, activationLink);
    }

    @Transactional
    public void resendActivationToken(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UserNotFoundException(email));

        if (Boolean.TRUE.equals(user.getEnabled())) {
            throw new UserAlreadyActivatedException(email);
        }

        log.info("Resending activation email to {}", email);
        sendActivationToken(user);
    }

    @Transactional
    public void confirmToken(String tokenValue) {
        EmailVerificationToken token = tokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new InvalidActivationTokenException("Activation token is invalid or has already been used."));

        if (token.getConfirmedAt() != null) {
            throw new InvalidActivationTokenException("Activation token has already been confirmed.");
        }

        Instant now = Instant.now();

        if (token.getExpiresAt().isBefore(now)) {
            tokenRepository.delete(token);
            throw new InvalidActivationTokenException("Activation token has expired. Please request a new one.");
        }

        User user = token.getUser();
        user.setEnabled(true);
        user.setEmailVerifiedAt(now);
        userRepository.save(user);

        token.setConfirmedAt(now);
        tokenRepository.save(token);

        log.info("User {} successfully activated their account.", user.getEmail());
    }
}

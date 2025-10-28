package com.eshop.api.email;

import com.eshop.api.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from-address:no-reply@eshop.local}")
    private String defaultFromAddress;

    public void sendAccountActivationEmail(User user, String activationLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(defaultFromAddress);
        message.setTo(user.getEmail());
        message.setSubject("Activate your E-Shop account");
        message.setText(buildActivationBody(user, activationLink));

        log.info("Sending account activation email to {}", user.getEmail());
        mailSender.send(message);
    }

    private String buildActivationBody(User user, String activationLink) {
        String greeting = user.getFirstName() != null && !user.getFirstName().isBlank()
                ? "Hi " + user.getFirstName() + ","
                : "Hi there,";

        return """
                %s

                Thanks for creating an account with E-Shop. Please confirm your email to activate your profile.

                Activate your account: %s

                If you did not sign up for this account, you can safely ignore this email.

                -- The E-Shop Team
                """.formatted(greeting, activationLink);
    }
}

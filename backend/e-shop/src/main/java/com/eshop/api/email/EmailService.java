package com.eshop.api.email;

import com.eshop.api.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from-address:E-Shop no-reply <no-reply@eshop.local>}")
    private String defaultFromAddress;

    public void sendAccountActivationEmail(User user, String activationLink) {
        log.info("Sending account activation email to {}", user.getEmail());
        sendHtmlEmail(user.getEmail(), "Activate your E-Shop account", buildActivationBody(user, activationLink));
    }

    public void sendPasswordResetToken(User user, String token) {
        log.info("Sending password reset token to {}", user.getEmail());
        sendHtmlEmail(user.getEmail(), "Reset your E-Shop password", buildPasswordResetBody(user, token));
    }

    private String buildActivationBody(User user, String activationLink) {
        String greeting = user.getFirstName() != null && !user.getFirstName().isBlank()
                ? "Hi " + user.getFirstName() + ","
                : "Hi there,";

        return """
                <p>%s</p>
                <p>Thanks for creating an account with E-Shop. Please confirm your email to activate your profile.</p>
                <p>
                    <a href="%s" style="display:inline-block;padding:10px 16px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:4px;">
                        Activate your account
                    </a>
                </p>
                <p>If you did not sign up for this account, you can safely ignore this email.</p>
                <p>-- The E-Shop Team</p>
                """.formatted(greeting, activationLink);
    }

    private String buildPasswordResetBody(User user, String token) {
        String greeting = user.getFirstName() != null && !user.getFirstName().isBlank()
                ? "Hi " + user.getFirstName() + ","
                : "Hi there,";

        return """
                <p>%s</p>
                <p>We received a request to reset your password. Use the verification code below to continue.</p>
                <p style="font-size:24px;font-weight:600;letter-spacing:6px;">%s</p>
                <p>This code expires soon. If you didn't request a reset, you can safely ignore this email.</p>
                <p>-- The E-Shop Team</p>
                """.formatted(greeting, token);
    }

    private void sendHtmlEmail(String recipient, String subject, String htmlBody) {
        var message = mailSender.createMimeMessage();

        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    "UTF-8");
            helper.setFrom(defaultFromAddress);
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(message);
        } catch (jakarta.mail.MessagingException e) {
            log.error("Failed to send email to {}", recipient, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }
}

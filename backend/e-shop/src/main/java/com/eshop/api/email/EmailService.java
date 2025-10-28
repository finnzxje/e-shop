package com.eshop.api.email;

import com.eshop.api.user.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
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
        MimeMessage message = mailSender.createMimeMessage();

        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    "UTF-8");
            helper.setFrom(defaultFromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject("Activate your E-Shop account");
            helper.setText(buildActivationBody(user, activationLink), true);

            log.info("Sending account activation email to {}", user.getEmail());
            mailSender.send(message);
        } catch (MessagingException e) {
            log.error("Failed to send activation email to {}", user.getEmail(), e);
            throw new RuntimeException("Failed to send activation email", e);
        }
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
}

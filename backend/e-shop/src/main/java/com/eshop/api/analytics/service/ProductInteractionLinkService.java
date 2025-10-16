package com.eshop.api.analytics.service;

import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductInteractionLinkService {

    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public void linkSessionToUser(UUID sessionId, String email) {
        if (sessionId == null) {
            throw new IllegalArgumentException("sessionId must be provided");
        }
        if (email == null || email.isBlank()) {
            throw new UsernameNotFoundException("Authenticated user email is required to link session");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        int updatedViews = entityManager.createNativeQuery(
                "UPDATE product_views SET user_id = :userId WHERE session_id = :sessionId AND user_id IS NULL")
            .setParameter("userId", user.getId())
            .setParameter("sessionId", sessionId)
            .executeUpdate();

        int updatedEvents = entityManager.createNativeQuery(
                "UPDATE product_interaction_events SET user_id = :userId WHERE session_id = :sessionId AND user_id IS NULL")
            .setParameter("userId", user.getId())
            .setParameter("sessionId", sessionId)
            .executeUpdate();

        log.debug("Linked session {} to user {}, updated {} views and {} interaction events", sessionId, user.getId(), updatedViews, updatedEvents);
    }
}

package com.eshop.api.user.service;

import com.eshop.api.exception.InvalidJwtException;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import com.eshop.api.user.dto.UserProfileResponse;
import com.eshop.api.user.dto.UserProfileUpdateRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserProfileService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String email) {
        User user = resolveUser(email);
        return toResponse(user);
    }

    public UserProfileResponse updateProfile(String email, UserProfileUpdateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Profile request must not be null");
        }

        User user = resolveUser(email);

        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhone(request.phone());

        User saved = userRepository.save(user);
        log.info("Updated profile for user {}", saved.getEmail());
        return toResponse(saved);
    }

    private User resolveUser(String email) {
        if (email == null || email.isBlank()) {
            throw new InvalidJwtException("Authentication is required to manage the profile");
        }

        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    private UserProfileResponse toResponse(User user) {
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                user.getEnabled(),
                user.getEmailVerifiedAt(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}

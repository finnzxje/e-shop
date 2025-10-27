package com.eshop.api.user.service;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.exception.RoleNotFoundException;
import com.eshop.api.exception.UserNotFoundException;
import com.eshop.api.order.dto.AddressResponse;
import com.eshop.api.order.model.Address;
import com.eshop.api.order.repository.AddressRepository;
import com.eshop.api.user.Role;
import com.eshop.api.user.RoleRepository;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import com.eshop.api.user.dto.AdminUserDetailResponse;
import com.eshop.api.user.dto.AdminUserSummaryResponse;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AddressRepository addressRepository;

    @Transactional(readOnly = true)
    public PageResponse<AdminUserSummaryResponse> listUsers(Boolean enabled,
                                                            String role,
                                                            String search,
                                                            Pageable pageable) {
        Specification<User> specification = buildSpecification(enabled, role, search);
        Page<User> page = userRepository.findAll(specification, pageable);

        List<AdminUserSummaryResponse> content = page.stream()
            .map(this::toSummaryResponse)
            .toList();

        return PageResponse.<AdminUserSummaryResponse>builder()
            .content(content)
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .page(page.getNumber())
            .size(page.getSize())
            .hasNext(page.hasNext())
            .hasPrevious(page.hasPrevious())
            .build();
    }

    @Transactional(readOnly = true)
    public AdminUserDetailResponse getUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));

        // Initialize roles collection before transaction closes
        user.getRoles().size();

        List<AddressResponse> addresses = mapAddresses(addressRepository.findByUser_IdOrderByCreatedAtDesc(userId));

        return toDetailResponse(user, addresses);
    }

    public AdminUserDetailResponse updateUserStatus(UUID userId, boolean enabled) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
        user.setEnabled(enabled);
        user = userRepository.save(user);

        user.getRoles().size();
        List<AddressResponse> addresses = mapAddresses(addressRepository.findByUser_IdOrderByCreatedAtDesc(userId));
        return toDetailResponse(user, addresses);
    }

    public AdminUserDetailResponse updateUserRoles(UUID userId, Set<String> roleNames) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));

        Set<String> normalizedNames = roleNames == null
            ? Set.of()
            : roleNames.stream()
                .map(name -> name == null ? null : name.trim())
                .filter(name -> name != null && !name.isEmpty())
                .map(name -> name.toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());

        List<Role> roles = normalizedNames.isEmpty()
            ? new ArrayList<>()
            : roleRepository.findByNameIn(normalizedNames);

        if (roles.size() != normalizedNames.size()) {
            throw new RoleNotFoundException("One or more roles were not found");
        }

        user.getRoles().clear();
        user.getRoles().addAll(roles);
        user = userRepository.save(user);

        user.getRoles().size();
        List<AddressResponse> addresses = mapAddresses(addressRepository.findByUser_IdOrderByCreatedAtDesc(userId));
        return toDetailResponse(user, addresses);
    }

    private Specification<User> buildSpecification(Boolean enabled, String role, String search) {
        return (root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("roles", JoinType.LEFT);
                query.distinct(true);
            }

            Predicate predicate = cb.conjunction();

            if (enabled != null) {
                predicate = cb.and(predicate, cb.equal(root.get("enabled"), enabled));
            }

            if (role != null && !role.isBlank()) {
                String normalizedRole = role.trim().toUpperCase(Locale.ROOT);
                Join<User, Role> roleJoin = root.join("roles", JoinType.INNER);
                predicate = cb.and(predicate, cb.equal(cb.upper(roleJoin.get("name")), normalizedRole));
            }

            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicate = cb.and(predicate, cb.or(
                    cb.like(cb.lower(root.get("email")), like),
                    cb.like(cb.lower(root.get("firstName")), like),
                    cb.like(cb.lower(root.get("lastName")), like)
                ));
            }

            return predicate;
        };
    }

    private AdminUserSummaryResponse toSummaryResponse(User user) {
        List<String> roleNames = user.getRoles().stream()
            .map(Role::getName)
            .sorted(String.CASE_INSENSITIVE_ORDER)
            .toList();

        return AdminUserSummaryResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .enabled(user.getEnabled())
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .roles(roleNames)
            .build();
    }

    private AdminUserDetailResponse toDetailResponse(User user, List<AddressResponse> addresses) {
        List<String> roleNames = user.getRoles().stream()
            .map(Role::getName)
            .sorted(String.CASE_INSENSITIVE_ORDER)
            .toList();

        return AdminUserDetailResponse.builder()
            .id(user.getId())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .phone(user.getPhone())
            .enabled(user.getEnabled())
            .emailVerifiedAt(user.getEmailVerifiedAt())
            .createdAt(user.getCreatedAt())
            .updatedAt(user.getUpdatedAt())
            .roles(roleNames)
            .addresses(addresses)
            .build();
    }

    private List<AddressResponse> mapAddresses(List<Address> addresses) {
        return addresses.stream()
            .map(address -> new AddressResponse(
                address.getId(),
                address.getLabel(),
                address.getRecipientName(),
                address.getPhone(),
                address.getLine1(),
                address.getLine2(),
                address.getCity(),
                address.getStateProvince(),
                address.getPostalCode(),
                address.getCountryCode(),
                address.getIsDefault(),
                address.getCreatedAt(),
                address.getUpdatedAt()
            ))
            .sorted(Comparator.comparing(AddressResponse::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    }
}

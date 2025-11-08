package com.eshop.api.user.admin;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.user.dto.AdminUserDetailResponse;
import com.eshop.api.user.dto.AdminUserRolesRequest;
import com.eshop.api.user.dto.AdminUserStatusRequest;
import com.eshop.api.user.dto.AdminUserSummaryResponse;
import com.eshop.api.user.service.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<PageResponse<AdminUserSummaryResponse>> listUsers(
        @RequestParam(value = "enabled", required = false) Boolean enabled,
        @RequestParam(value = "role", required = false) String role,
        @RequestParam(value = "search", required = false) String search,
        @PageableDefault(size = 20) Pageable pageable
    ) {
        PageResponse<AdminUserSummaryResponse> response = adminUserService.listUsers(enabled, role, search, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<AdminUserDetailResponse> getUser(@PathVariable("userId") UUID userId) {
        AdminUserDetailResponse response = adminUserService.getUser(userId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{userId}/status")
    public ResponseEntity<AdminUserDetailResponse> updateStatus(
        @PathVariable("userId") UUID userId,
        @Valid @RequestBody AdminUserStatusRequest request
    ) {
        AdminUserDetailResponse response = adminUserService.updateUserStatus(userId, request.enabled());
        return ResponseEntity.status(HttpStatus.OK).body(response);
    }

    @PutMapping("/{userId}/roles")
    public ResponseEntity<AdminUserDetailResponse> updateRoles(
        @PathVariable("userId") UUID userId,
        @Valid @RequestBody AdminUserRolesRequest request
    ) {
        AdminUserDetailResponse response = adminUserService.updateUserRoles(userId, request.roles());
        return ResponseEntity.ok(response);
    }
}

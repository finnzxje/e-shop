package com.eshop.api.auth;

import com.eshop.api.auth.dto.ActivationResponse;
import com.eshop.api.auth.dto.AuthResponse;
import com.eshop.api.auth.dto.AuthStatusResponse;
import com.eshop.api.auth.dto.LoginRequest;
import com.eshop.api.auth.dto.RefreshTokenRequest;
import com.eshop.api.auth.dto.RegisterRequest;
import com.eshop.api.auth.dto.ResendActivationRequest;
import com.eshop.api.exception.InvalidJwtException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authenticationService;
    private final AccountActivationService accountActivationService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authenticationService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request,
                                              @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                              @RequestHeader(value = "sec-ch-ua", required = false) String secChUa,
                                              @RequestHeader(value = "sec-ch-ua-platform", required = false) String secChUaPlatform,
                                              @RequestHeader(value = "sec-ch-ua-mobile", required = false) String secChUaMobile) {
        AuthResponse response = authenticationService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authenticationService.refresh(request.refreshToken());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidJwtException("Authentication is required to fetch the current user profile");
        }

        AuthResponse response = authenticationService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/test-token")
    public ResponseEntity<AuthStatusResponse> testToken(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthStatusResponse(false, null, List.of()));
        }

        AuthStatusResponse body = new AuthStatusResponse(
                true,
                authentication.getName(),
                authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .map(authority -> authority.startsWith("ROLE_") ? authority.substring(5) : authority)
                        .toList()
        );

        return ResponseEntity.ok(body);
    }

    @GetMapping("/activate")
    public ResponseEntity<ActivationResponse> activateAccount(@RequestParam("token") String token) {
        accountActivationService.confirmToken(token);
        return ResponseEntity.ok(new ActivationResponse(true, "Account activated successfully."));
    }

    @PostMapping("/activate/resend")
    public ResponseEntity<ActivationResponse> resendActivation(@Valid @RequestBody ResendActivationRequest request) {
        accountActivationService.resendActivationToken(request.email());
        return ResponseEntity.ok(new ActivationResponse(false, "Activation email sent."));
    }
}

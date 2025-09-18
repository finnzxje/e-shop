package com.eshop.api.auth;

import com.eshop.api.auth.dto.AuthResponse;
import com.eshop.api.auth.dto.LoginRequest;
import com.eshop.api.auth.dto.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authenticationService;

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
}
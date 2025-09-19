package com.eshop.api.security;

import com.eshop.api.config.AppEnv;
import com.eshop.api.exception.InvalidJwtException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@AllArgsConstructor
public class JwtService {

    public static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_TOKEN_TYPE = "tokenType";
    private static final String TOKEN_TYPE_ACCESS = "ACCESS";
    private static final String TOKEN_TYPE_REFRESH = "REFRESH";

    private final AppEnv appEnv;

    public String generateAccessToken(String subject, List<String> roles) {
        log.info("Generating Access Token...");
        return createJwtToken(subject, roles, appEnv.getJwt().getAccessExpirationSeconds(), TOKEN_TYPE_ACCESS);
    }

    public String generateRefreshToken(String subject, List<String> roles) {
        log.info("Generating Refresh Token...");
        return createJwtToken(subject, roles, appEnv.getJwt().getRefreshExpirationSeconds(), TOKEN_TYPE_REFRESH);
    }

    private String createJwtToken(String subject, List<String> roles, long expirationSeconds, String tokenType) {
        Instant now = Instant.now();
        Date issuedAt = Date.from(now);
        Date expiration = Date.from(now.plusSeconds(expirationSeconds));

        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_ROLES, roles);
        claims.put(CLAIM_TOKEN_TYPE, tokenType);

        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith(getSignatureKey())
                .compact();
    }

    private SecretKey getSignatureKey() {
        return Keys.hmacShaKeyFor(appEnv.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public Claims extractClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSignatureKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public Claims extractClaimsOrThrow(String token) throws InvalidJwtException {
        Claims claims = extractClaims(token);
        if (claims == null)
            throw new InvalidJwtException("Failed to parse the token");
        return claims;
    }

    public String getUsername(Claims claims) {
        return claims.getSubject();
    }

    public List<String> getUserRoles(Claims claims) {
        Object rolesObj = claims.get(CLAIM_ROLES);
        if (rolesObj instanceof List) {
            return (List<String>) rolesObj;
        } else if (rolesObj instanceof String) {
            return List.of((String) rolesObj);
        } else if (rolesObj instanceof Map) {
            return List.of(rolesObj.toString());
        }
        return List.of();
    }

    public Date getExpiry(Claims claims) {
        return claims.getExpiration();
    }

    public Date getIssuedAt(Claims claims) {
        return claims.getIssuedAt();
    }

    public boolean isRefreshToken(Claims claims) {
        return TOKEN_TYPE_REFRESH.equals(claims.get(CLAIM_TOKEN_TYPE, String.class));
    }

    public boolean isAccessToken(Claims claims) {
        return TOKEN_TYPE_ACCESS.equals(claims.get(CLAIM_TOKEN_TYPE, String.class));
    }
}

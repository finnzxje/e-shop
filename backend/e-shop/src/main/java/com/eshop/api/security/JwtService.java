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
import java.util.Date;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@AllArgsConstructor
public class JwtService {

    private final AppEnv appEnv;

    public String generateAccessToken(TokenPayload tokenPayload) {
        log.info("Generating Access Token...");
        return createJwtToken(tokenPayload);
    }

    public String generateRefreshToken(TokenPayload tokenPayload) {
        log.info("Generating Refresh Token...");
        return createJwtToken(tokenPayload);
    }

    private String createJwtToken(TokenPayload tokenPayload) {
        return Jwts.builder()
                .claims(tokenPayload.getClaims())
                .subject(tokenPayload.getSubject())
                .issuedAt(tokenPayload.getIssuedAt())
                .expiration(tokenPayload.getExpiration())
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
        Object rolesObj = claims.get(TokenPayload.CLAIM_ROLES);
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

    public String getBrowserName(Claims claims) {
        return claims.get(TokenPayload.CLAIM_BROWSER_NAME, String.class);
    }

    public String getSecChUaPlatform(Claims claims) {
        return claims.get(TokenPayload.CLAIM_SEC_CH_UA_PLATFORM, String.class);
    }

    public String getSecChUaMobile(Claims claims) {
        return claims.get(TokenPayload.CLAIM_SEC_CH_UA_MOBILE, String.class);
    }

    public String getJwtId(Claims claims) {
        return claims.get(TokenPayload.CLAIM_JWT_ID, String.class);
    }

    public String getUserAgent(Claims claims) {
        return claims.get(TokenPayload.CLAIM_USER_AGENT, String.class);
    }
}
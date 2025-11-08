package com.eshop.api.security;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtStompChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            Authentication authentication = authenticate(accessor);
            accessor.setUser(authentication);
        }

        return message;
    }

    private Authentication authenticate(StompHeaderAccessor accessor) {
        String rawToken = resolveToken(accessor);
        if (!StringUtils.hasText(rawToken)) {
            throw new MessageDeliveryException("Missing Authorization header for STOMP connection");
        }

        try {
            Claims claims = jwtService.extractClaimsOrThrow(rawToken);
            if (!jwtService.isAccessToken(claims)) {
                throw new MessageDeliveryException("Invalid token type for STOMP connection");
            }
            String username = jwtService.getUsername(claims);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            return new UsernamePasswordAuthenticationToken(userDetails.getUsername(), null, userDetails.getAuthorities());
        } catch (Exception ex) {
            log.warn("Failed to authenticate STOMP connection: {}", ex.getMessage());
            throw new MessageDeliveryException("Unauthorized STOMP connection");
        }
    }

    private String resolveToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            authHeaders = accessor.getNativeHeader("authorization");
        }
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String header = authHeaders.get(0);
            if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
                return header.substring(7);
            }
            return header;
        }

        List<String> accessTokens = accessor.getNativeHeader("access_token");
        if (accessTokens != null && !accessTokens.isEmpty()) {
            return accessTokens.get(0);
        }

        return null;
    }
}

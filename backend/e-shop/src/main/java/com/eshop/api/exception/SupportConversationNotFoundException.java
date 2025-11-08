package com.eshop.api.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class SupportConversationNotFoundException extends ApiException {

    public SupportConversationNotFoundException(UUID conversationId) {
        super("Support conversation not found: " + conversationId, HttpStatus.NOT_FOUND.value());
    }
}

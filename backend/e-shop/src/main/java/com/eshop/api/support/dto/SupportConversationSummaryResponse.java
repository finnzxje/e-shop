package com.eshop.api.support.dto;

import com.eshop.api.support.enums.SupportConversationStatus;

import java.time.Instant;
import java.util.UUID;

public record SupportConversationSummaryResponse(
    UUID id,
    SupportConversationStatus status,
    String subject,
    Instant lastMessageAt,
    SupportUserSummaryResponse customer,
    SupportUserSummaryResponse assignedStaff,
    SupportMessageResponse lastMessage,
    long unreadCount
) {
}

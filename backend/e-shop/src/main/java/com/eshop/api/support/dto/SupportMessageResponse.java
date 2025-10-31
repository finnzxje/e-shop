package com.eshop.api.support.dto;

import com.eshop.api.support.enums.SupportSenderType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SupportMessageResponse(
    UUID id,
    UUID conversationId,
    SupportSenderType senderType,
    SupportUserSummaryResponse sender,
    String body,
    List<String> attachmentUrls,
    Instant readAt,
    Instant createdAt
) {
}

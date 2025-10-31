package com.eshop.api.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateSupportConversationRequest(
    @Size(max = 180) String subject,
    @NotBlank String message,
    List<String> attachmentUrls
) {
}

package com.eshop.api.support.dto;

import com.eshop.api.support.enums.SupportConversationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateSupportConversationStatusRequest(
    @NotNull SupportConversationStatus status
) {
}

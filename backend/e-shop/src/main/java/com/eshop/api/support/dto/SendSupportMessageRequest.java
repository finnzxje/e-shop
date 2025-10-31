package com.eshop.api.support.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record SendSupportMessageRequest(
    @NotBlank String body,
    List<String> attachmentUrls
) {
}

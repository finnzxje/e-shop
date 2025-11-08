package com.eshop.api.support.controller;

import com.eshop.api.support.dto.SendSupportMessageRequest;
import com.eshop.api.support.service.SupportMessagingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class SupportMessagingController {

    private final SupportMessagingService supportMessagingService;

    @MessageMapping("/support/{conversationId}/messages")
    public void handleMessage(@DestinationVariable UUID conversationId,
                              @Payload @Valid SendSupportMessageRequest request,
                              Principal principal) {
        supportMessagingService.sendMessage(conversationId, principal.getName(), request);
    }
}

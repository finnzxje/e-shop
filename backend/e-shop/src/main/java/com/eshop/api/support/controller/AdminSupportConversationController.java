package com.eshop.api.support.controller;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.support.dto.SendSupportMessageRequest;
import com.eshop.api.support.dto.SupportConversationSummaryResponse;
import com.eshop.api.support.dto.SupportMessageResponse;
import com.eshop.api.support.dto.UpdateSupportConversationStatusRequest;
import com.eshop.api.support.enums.SupportConversationStatus;
import com.eshop.api.support.service.SupportMessagingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/support/conversations")
@RequiredArgsConstructor
public class AdminSupportConversationController {

    private final SupportMessagingService supportMessagingService;

    @GetMapping
    public ResponseEntity<PageResponse<SupportConversationSummaryResponse>> listConversations(@RequestParam(defaultValue = "0") int page,
                                                                                               @RequestParam(defaultValue = "20") int size,
                                                                                               @RequestParam(value = "status", required = false) List<SupportConversationStatus> statuses,
                                                                                               Principal principal) {
        PageResponse<SupportConversationSummaryResponse> response = supportMessagingService.listConversationsForStaff(
            principal.getName(),
            statuses,
            PageRequest.of(page, size)
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/assigned")
    public ResponseEntity<PageResponse<SupportConversationSummaryResponse>> listAssigned(@RequestParam(defaultValue = "0") int page,
                                                                                          @RequestParam(defaultValue = "20") int size,
                                                                                          Principal principal) {
        PageResponse<SupportConversationSummaryResponse> response = supportMessagingService.listAssignedConversations(
            principal.getName(),
            PageRequest.of(page, size)
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<List<SupportMessageResponse>> getMessages(@PathVariable UUID conversationId,
                                                                     Principal principal) {
        List<SupportMessageResponse> responses = supportMessagingService.getMessages(conversationId, principal.getName());
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{conversationId}/messages")
    public ResponseEntity<SupportMessageResponse> sendMessage(@PathVariable UUID conversationId,
                                                               @Valid @RequestBody SendSupportMessageRequest request,
                                                               Principal principal) {
        SupportMessageResponse response = supportMessagingService.sendMessage(conversationId, principal.getName(), request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{conversationId}/status")
    public ResponseEntity<SupportConversationSummaryResponse> updateStatus(@PathVariable UUID conversationId,
                                                                            @Valid @RequestBody UpdateSupportConversationStatusRequest request,
                                                                            Principal principal) {
        SupportConversationSummaryResponse response = supportMessagingService.updateStatus(conversationId, principal.getName(), request.status());
        return ResponseEntity.ok(response);
    }
}

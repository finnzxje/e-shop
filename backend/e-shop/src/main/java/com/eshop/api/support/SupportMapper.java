package com.eshop.api.support;

import com.eshop.api.support.dto.SupportConversationSummaryResponse;
import com.eshop.api.support.dto.SupportMessageResponse;
import com.eshop.api.support.dto.SupportUserSummaryResponse;
import com.eshop.api.support.model.SupportConversation;
import com.eshop.api.support.model.SupportMessage;
import com.eshop.api.user.User;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class SupportMapper {

    public SupportConversationSummaryResponse toSummary(SupportConversation conversation,
                                                         SupportMessage lastMessage,
                                                         long unreadCount) {
        return new SupportConversationSummaryResponse(
            conversation.getId(),
            conversation.getStatus(),
            conversation.getSubject(),
            conversation.getLastMessageAt(),
            toUserSummary(conversation.getCustomer()),
            toUserSummary(conversation.getAssignedStaff()),
            lastMessage != null ? toMessageResponse(lastMessage) : null,
            unreadCount
        );
    }

    public SupportMessageResponse toMessageResponse(SupportMessage message) {
        return new SupportMessageResponse(
            message.getId(),
            message.getConversation().getId(),
            message.getSenderType(),
            toUserSummary(message.getSender()),
            message.getBody(),
            message.getAttachmentUrlList(),
            message.getReadAt(),
            message.getCreatedAt()
        );
    }

    public SupportUserSummaryResponse toUserSummary(User user) {
        if (user == null) {
            return null;
        }
        return new SupportUserSummaryResponse(
            user.getId(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName()
        );
    }

    public List<SupportMessageResponse> toMessageResponses(List<SupportMessage> messages) {
        return messages.stream().map(this::toMessageResponse).toList();
    }
}

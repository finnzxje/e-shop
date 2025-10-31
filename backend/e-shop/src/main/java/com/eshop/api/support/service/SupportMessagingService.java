package com.eshop.api.support.service;

import com.eshop.api.catalog.dto.PageResponse;
import com.eshop.api.exception.SupportConversationNotFoundException;
import com.eshop.api.exception.SupportMessageForbiddenException;
import com.eshop.api.support.SupportMapper;
import com.eshop.api.support.dto.CreateSupportConversationRequest;
import com.eshop.api.support.dto.SendSupportMessageRequest;
import com.eshop.api.support.dto.SupportConversationSummaryResponse;
import com.eshop.api.support.dto.SupportMessageResponse;
import com.eshop.api.support.enums.SupportConversationStatus;
import com.eshop.api.support.enums.SupportSenderType;
import com.eshop.api.support.model.SupportConversation;
import com.eshop.api.support.model.SupportMessage;
import com.eshop.api.support.repository.SupportConversationRepository;
import com.eshop.api.support.repository.SupportMessageRepository;
import com.eshop.api.user.Role;
import com.eshop.api.user.User;
import com.eshop.api.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SupportMessagingService {

    private static final String CONVERSATION_TOPIC_TEMPLATE = "/topic/support/conversations/%s";

    private final SupportConversationRepository conversationRepository;
    private final SupportMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SupportMapper supportMapper;
    private final SimpMessagingTemplate messagingTemplate;

    public SupportConversationSummaryResponse startConversation(String customerEmail,
                                                                 CreateSupportConversationRequest request) {
        User customer = requireUserByEmail(customerEmail);
        Instant now = Instant.now();

        SupportConversation conversation = SupportConversation.builder()
            .customer(customer)
            .status(SupportConversationStatus.WAITING_STAFF)
            .subject(normalize(request.subject()))
            .lastMessageAt(now)
            .metadata(null)
            .messages(new ArrayList<>())
            .build();
        conversation.ensureMetadata();
        conversation = conversationRepository.save(conversation);

        SupportMessage message = buildMessage(
            conversation,
            customer,
            SupportSenderType.CUSTOMER,
            request.message(),
            sanitizeAttachments(request.attachmentUrls()),
            now
        );

        message = messageRepository.save(message);

        SupportMessageResponse messageResponse = supportMapper.toMessageResponse(message);
        broadcastNewMessage(conversation.getId(), messageResponse);

        return supportMapper.toSummary(conversation, message, 0L);
    }

    public SupportMessageResponse sendMessage(UUID conversationId,
                                              String senderEmail,
                                              SendSupportMessageRequest request) {
        User sender = requireUserByEmail(senderEmail);
        SupportConversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new SupportConversationNotFoundException(conversationId));

        SupportSenderType senderType = resolveSenderType(conversation, sender);
        Instant now = Instant.now();

        if (senderType == SupportSenderType.STAFF && conversation.getAssignedStaff() == null) {
            conversation.setAssignedStaff(sender);
        }

        if (senderType == SupportSenderType.CUSTOMER) {
            conversation.setStatus(SupportConversationStatus.WAITING_STAFF);
        } else {
            conversation.setStatus(SupportConversationStatus.WAITING_CUSTOMER);
        }
        conversation.setLastMessageAt(now);

        SupportMessage message = buildMessage(
            conversation,
            sender,
            senderType,
            request.body(),
            sanitizeAttachments(request.attachmentUrls()),
            now
        );

        message = messageRepository.save(message);
        conversationRepository.save(conversation);

        SupportMessageResponse messageResponse = supportMapper.toMessageResponse(message);
        broadcastNewMessage(conversation.getId(), messageResponse);

        return messageResponse;
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public PageResponse<SupportConversationSummaryResponse> listCustomerConversations(String customerEmail,
                                                                                       Pageable pageable) {
        User customer = requireUserByEmail(customerEmail);
        Page<SupportConversation> page = conversationRepository.findByCustomer_IdOrderByLastMessageAtDesc(customer.getId(), pageable);
        List<SupportConversationSummaryResponse> content = page.getContent().stream()
            .map(conversation -> mapConversation(conversation, SupportSenderType.CUSTOMER))
            .toList();
        return toPageResponse(page, content);
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public PageResponse<SupportConversationSummaryResponse> listAssignedConversations(String staffEmail,
                                                                                       Pageable pageable) {
        User staff = requireStaffByEmail(staffEmail);
        Page<SupportConversation> page = conversationRepository.findByAssignedStaff_IdOrderByLastMessageAtDesc(staff.getId(), pageable);
        List<SupportConversationSummaryResponse> content = page.getContent().stream()
            .map(conversation -> mapConversation(conversation, SupportSenderType.STAFF))
            .toList();
        return toPageResponse(page, content);
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public PageResponse<SupportConversationSummaryResponse> listConversationsForStaff(String staffEmail,
                                                                                       Collection<SupportConversationStatus> statuses,
                                                                                       Pageable pageable) {
        requireStaffByEmail(staffEmail);
        Collection<SupportConversationStatus> effectiveStatuses = (statuses == null || statuses.isEmpty())
            ? EnumSet.of(SupportConversationStatus.OPEN, SupportConversationStatus.WAITING_CUSTOMER, SupportConversationStatus.WAITING_STAFF)
            : EnumSet.copyOf(statuses);

        Page<SupportConversation> page;
        if (effectiveStatuses.size() == SupportConversationStatus.values().length) {
            page = conversationRepository.findAllByOrderByLastMessageAtDesc(pageable);
        } else {
            page = conversationRepository.findByStatusInOrderByLastMessageAtDesc(effectiveStatuses, pageable);
        }

        List<SupportConversationSummaryResponse> content = page.getContent().stream()
            .map(conversation -> mapConversation(conversation, SupportSenderType.STAFF))
            .toList();
        return toPageResponse(page, content);
    }

    @Transactional(Transactional.TxType.SUPPORTS)
    public List<SupportMessageResponse> getMessages(UUID conversationId, String requesterEmail) {
        User requester = requireUserByEmail(requesterEmail);
        SupportConversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new SupportConversationNotFoundException(conversationId));
        SupportSenderType viewerType = resolveViewerType(conversation, requester);

        List<SupportMessage> messages = messageRepository.findByConversation_IdOrderByCreatedAtAsc(conversationId);
        Instant now = Instant.now();
        boolean updated = false;
        for (SupportMessage message : messages) {
            if (message.getSenderType() != viewerType && message.getReadAt() == null) {
                message.setReadAt(now);
                updated = true;
            }
        }
        if (updated) {
            messageRepository.saveAll(messages);
        }
        return supportMapper.toMessageResponses(messages);
    }

    public SupportConversationSummaryResponse updateStatus(UUID conversationId,
                                                            String staffEmail,
                                                            SupportConversationStatus status) {
        User staff = requireStaffByEmail(staffEmail);
        SupportConversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new SupportConversationNotFoundException(conversationId));

        conversation.setStatus(status);
        if (conversation.getAssignedStaff() == null && status != SupportConversationStatus.OPEN) {
            conversation.setAssignedStaff(staff);
        }
        conversationRepository.save(conversation);

        SupportMessage lastMessage = messageRepository.findFirstByConversation_IdOrderByCreatedAtDesc(conversationId)
            .orElse(null);

        return mapConversation(conversation, SupportSenderType.STAFF, lastMessage);
    }

    private SupportConversationSummaryResponse mapConversation(SupportConversation conversation,
                                                                SupportSenderType viewerType) {
        SupportMessage lastMessage = messageRepository.findFirstByConversation_IdOrderByCreatedAtDesc(conversation.getId())
            .orElse(null);
        return mapConversation(conversation, viewerType, lastMessage);
    }

    private SupportConversationSummaryResponse mapConversation(SupportConversation conversation,
                                                                SupportSenderType viewerType,
                                                                SupportMessage lastMessage) {
        long unreadCount = messageRepository.countByConversation_IdAndReadAtIsNullAndSenderTypeNot(conversation.getId(), viewerType);
        return supportMapper.toSummary(conversation, lastMessage, unreadCount);
    }

    private SupportMessage buildMessage(SupportConversation conversation,
                                        User sender,
                                        SupportSenderType senderType,
                                        String body,
                                        List<String> attachments,
                                        Instant timestamp) {
        SupportMessage message = SupportMessage.builder()
            .conversation(conversation)
            .sender(sender)
            .senderType(senderType)
            .body(body == null ? null : body.trim())
            .metadata(null)
            .build();
        message.ensureMetadata();
        message.setAttachmentUrlsFromList(attachments);
        message.setCreatedAt(timestamp);
        message.setUpdatedAt(timestamp);
        return message;
    }

    private SupportSenderType resolveSenderType(SupportConversation conversation, User sender) {
        if (conversation.getCustomer() != null && conversation.getCustomer().getId().equals(sender.getId())) {
            return SupportSenderType.CUSTOMER;
        }
        if (isStaff(sender)) {
            return SupportSenderType.STAFF;
        }
        throw new SupportMessageForbiddenException();
    }

    private SupportSenderType resolveViewerType(SupportConversation conversation, User viewer) {
        if (conversation.getCustomer() != null && conversation.getCustomer().getId().equals(viewer.getId())) {
            return SupportSenderType.CUSTOMER;
        }
        if (isStaff(viewer)) {
            return SupportSenderType.STAFF;
        }
        throw new SupportMessageForbiddenException();
    }

    private User requireUserByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new UsernameNotFoundException("User email is required");
        }
        return userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    private User requireStaffByEmail(String email) {
        User user = requireUserByEmail(email);
        if (!isStaff(user)) {
            throw new SupportMessageForbiddenException();
        }
        return user;
    }

    private boolean isStaff(User user) {
        Set<String> roleNames = user.getRoles().stream()
            .map(Role::getName)
            .map(name -> name == null ? null : name.toUpperCase(Locale.ENGLISH))
            .collect(Collectors.toSet());

        return roleNames.contains("ROLE_ADMIN") || roleNames.contains("ADMIN") || roleNames.contains("STAFF");
    }

    private List<String> sanitizeAttachments(List<String> attachments) {
        if (attachments == null) {
            return List.of();
        }
        return attachments.stream()
            .filter(url -> url != null && !url.isBlank())
            .map(String::trim)
            .toList();
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private <T> PageResponse<T> toPageResponse(Page<?> page, List<T> content) {
        return PageResponse.<T>builder()
            .content(content)
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .page(page.getNumber())
            .size(page.getSize())
            .hasNext(page.hasNext())
            .hasPrevious(page.hasPrevious())
            .build();
    }

    private void broadcastNewMessage(UUID conversationId, SupportMessageResponse payload) {
        messagingTemplate.convertAndSend(String.format(CONVERSATION_TOPIC_TEMPLATE, conversationId), payload);
    }
}

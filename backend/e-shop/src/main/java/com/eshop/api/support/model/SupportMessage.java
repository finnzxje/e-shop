package com.eshop.api.support.model;

import com.eshop.api.support.enums.SupportSenderType;
import com.eshop.api.user.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.*;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "support_messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportMessage {

    @jakarta.persistence.Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private SupportConversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "sender_type", nullable = false, columnDefinition = "support_sender_type_enum")
    private SupportSenderType senderType;

    @Column(name = "body", nullable = false, columnDefinition = "text")
    private String body;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "attachment_urls", nullable = false, columnDefinition = "text[]")
    private String[] attachmentUrls;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", nullable = false)
    private JsonNode metadata;

    @Column(name = "read_at")
    private Instant readAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public void ensureMetadata() {
        if (metadata == null || metadata.isNull()) {
            metadata = JsonNodeFactory.instance.objectNode();
        }
    }

    public void setAttachmentUrlsFromList(List<String> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            this.attachmentUrls = new String[0];
        } else {
            this.attachmentUrls = attachments.toArray(String[]::new);
        }
    }

    public List<String> getAttachmentUrlList() {
        if (attachmentUrls == null || attachmentUrls.length == 0) {
            return List.of();
        }
        return Arrays.asList(attachmentUrls);
    }
}

package com.eshop.api.support.repository;

import com.eshop.api.support.enums.SupportSenderType;
import com.eshop.api.support.model.SupportMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupportMessageRepository extends JpaRepository<SupportMessage, UUID> {

    List<SupportMessage> findByConversation_IdOrderByCreatedAtAsc(UUID conversationId);

    long countByConversation_IdAndReadAtIsNullAndSenderTypeNot(UUID conversationId, SupportSenderType senderType);

    Optional<SupportMessage> findFirstByConversation_IdOrderByCreatedAtDesc(UUID conversationId);
}

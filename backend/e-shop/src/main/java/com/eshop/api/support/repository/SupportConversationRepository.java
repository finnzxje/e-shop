package com.eshop.api.support.repository;

import com.eshop.api.support.enums.SupportConversationStatus;
import com.eshop.api.support.model.SupportConversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupportConversationRepository extends JpaRepository<SupportConversation, UUID> {

    Page<SupportConversation> findByCustomer_IdOrderByLastMessageAtDesc(UUID customerId, Pageable pageable);

    Page<SupportConversation> findByAssignedStaff_IdOrderByLastMessageAtDesc(UUID staffId, Pageable pageable);

    Page<SupportConversation> findByStatusInOrderByLastMessageAtDesc(Collection<SupportConversationStatus> statuses, Pageable pageable);

    Page<SupportConversation> findAllByOrderByLastMessageAtDesc(Pageable pageable);

    Optional<SupportConversation> findByIdAndCustomer_Id(UUID conversationId, UUID customerId);

    Optional<SupportConversation> findByIdAndAssignedStaff_Id(UUID conversationId, UUID staffId);
}

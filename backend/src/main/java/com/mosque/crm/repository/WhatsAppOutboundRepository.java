package com.mosque.crm.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.WhatsAppOutboundMessage;

import jakarta.persistence.LockModeType;

@Repository
public interface WhatsAppOutboundRepository extends JpaRepository<WhatsAppOutboundMessage, Long> {

    Page<WhatsAppOutboundMessage> findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<WhatsAppOutboundMessage> findByCampaignIdAndDeletedAtIsNullOrderByCreatedAtAsc(String campaignId, Pageable pageable);

    Page<WhatsAppOutboundMessage> findByDeletedAtIsNullOrderByCreatedAtDesc(Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM WhatsAppOutboundMessage m WHERE m.id = :id AND m.deletedAt IS NULL "
            + "AND (:organizationId IS NULL OR m.organizationId = :organizationId)")
    Optional<WhatsAppOutboundMessage> findVisibleForUpdate(
            @Param("id") Long id, @Param("organizationId") Long organizationId);

    long countByStatus(String status);

    long countByStatusAndSentAtAfter(String status, LocalDateTime after);

    /** Earliest successful send — used to work out which warm-up day the number is on. */
    @Query("SELECT MIN(m.sentAt) FROM WhatsAppOutboundMessage m WHERE m.status = 'SENT'")
    Optional<LocalDateTime> findFirstSentAt();

    /**
     * One claimable message, locked so that concurrent app instances cannot send the same row.
     * Runs without a tenant context, so the Hibernate organization filter is not applied.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM WhatsAppOutboundMessage m "
            + "WHERE m.status = 'QUEUED' AND m.nextAttemptAt <= :now "
            + "ORDER BY m.nextAttemptAt ASC, m.id ASC")
    List<WhatsAppOutboundMessage> findDueForUpdate(@Param("now") LocalDateTime now, Pageable pageable);

    /** Next queued message after a send, so its delay can be pushed out to the real send time. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM WhatsAppOutboundMessage m WHERE m.status = 'QUEUED' ORDER BY m.nextAttemptAt ASC, m.id ASC")
    List<WhatsAppOutboundMessage> findNextQueued(Pageable pageable);

    /** Latest planned send time in the queue — used to keep new campaigns from bunching up. */
    @Query("SELECT MAX(m.nextAttemptAt) FROM WhatsAppOutboundMessage m WHERE m.status = 'QUEUED'")
    Optional<LocalDateTime> findLastQueuedNextAttempt();

    /**
     * Moves every due message to {@code retryAt} when a cap or the quiet window blocks sending.
     * Caps apply to the shared WhatsApp number, so this intentionally spans all organisations.
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE WhatsAppOutboundMessage m SET m.nextAttemptAt = :retryAt "
            + "WHERE m.status = 'QUEUED' AND m.nextAttemptAt <= :now")
    int deferDue(@Param("now") LocalDateTime now, @Param("retryAt") LocalDateTime retryAt);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<WhatsAppOutboundMessage> findByRecipientPhoneAndStatus(String recipientPhone, String status);

    @Query("SELECT COUNT(m) FROM WhatsAppOutboundMessage m WHERE m.recipientPhone = :phone AND m.status IN ('QUEUED', 'SENDING')")
    long countPendingForPhone(@Param("phone") String phone);
}

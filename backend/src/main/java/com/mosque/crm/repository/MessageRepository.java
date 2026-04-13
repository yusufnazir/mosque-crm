package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Message;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    List<Message> findBySenderIdOrderByCreatedAtDesc(Long senderId);

    long countByRecipientIdAndReadFalse(Long recipientId);

    /**
     * Get all messages in a conversation between two users, ordered oldest first.
     */
    @Query("SELECT m FROM Message m WHERE " +
           "(m.senderId = :userA AND m.recipientId = :userB) OR " +
           "(m.senderId = :userB AND m.recipientId = :userA) " +
           "ORDER BY m.createdAt ASC")
    List<Message> findConversation(@Param("userA") Long userA, @Param("userB") Long userB);

    /**
     * Get the latest message per conversation thread (user pair + base subject) for the inbox view.
     * Groups by user pair AND normalized subject (stripping RE: prefixes).
     */
    @Query(value =
        "SELECT m.* FROM messages m " +
        "INNER JOIN (" +
        "  SELECT LEAST(sender_id, recipient_id) AS p1, GREATEST(sender_id, recipient_id) AS p2, " +
        "         REGEXP_REPLACE(subject, '^(RE: |Re: |re: )*', '') AS base_subj, MAX(id) AS max_id " +
        "  FROM messages " +
        "  WHERE (sender_id = :userId OR recipient_id = :userId) AND organization_id = :orgId " +
        "  GROUP BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), " +
        "           REGEXP_REPLACE(subject, '^(RE: |Re: |re: )*', '')" +
        ") latest ON m.id = latest.max_id " +
        "ORDER BY m.created_at DESC",
        nativeQuery = true)
    List<Message> findLatestMessagePerConversation(@Param("userId") Long userId, @Param("orgId") Long orgId);

    /**
     * Paginated version of the inbox thread query.
     */
    @Query(value =
        "SELECT m.* FROM messages m " +
        "INNER JOIN (" +
        "  SELECT LEAST(sender_id, recipient_id) AS p1, GREATEST(sender_id, recipient_id) AS p2, " +
        "         REGEXP_REPLACE(subject, '^(RE: |Re: |re: )*', '') AS base_subj, MAX(id) AS max_id " +
        "  FROM messages " +
        "  WHERE (sender_id = :userId OR recipient_id = :userId) AND organization_id = :orgId " +
        "  GROUP BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), " +
        "           REGEXP_REPLACE(subject, '^(RE: |Re: |re: )*', '')" +
        ") latest ON m.id = latest.max_id " +
        "ORDER BY m.created_at DESC " +
        "LIMIT :lim OFFSET :off",
        nativeQuery = true)
    List<Message> findLatestMessagePerConversationPaged(@Param("userId") Long userId, @Param("orgId") Long orgId,
                                                        @Param("lim") int lim, @Param("off") int off);

    /**
     * Count total conversation threads for a user (for pagination).
     */
    @Query(value =
        "SELECT COUNT(*) FROM (" +
        "  SELECT 1 FROM messages " +
        "  WHERE (sender_id = :userId OR recipient_id = :userId) AND organization_id = :orgId " +
        "  GROUP BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), " +
        "           REGEXP_REPLACE(subject, '^(RE: |Re: |re: )*', '')" +
        ") thread_count",
        nativeQuery = true)
    long countConversationThreads(@Param("userId") Long userId, @Param("orgId") Long orgId);

    /**
     * Get all messages in a conversation thread (user pair + base subject), ordered oldest first.
     */
    @Query(value =
        "SELECT m.* FROM messages m " +
        "WHERE ((sender_id = :userA AND recipient_id = :userB) OR (sender_id = :userB AND recipient_id = :userA)) " +
        "AND REGEXP_REPLACE(subject, '^(RE: |Re: |re: )*', '') = :baseSubject " +
        "ORDER BY created_at ASC",
        nativeQuery = true)
    List<Message> findConversationBySubject(@Param("userA") Long userA, @Param("userB") Long userB, @Param("baseSubject") String baseSubject);

    /**
     * Count unread messages in a specific thread (by sender and base subject).
     */
    @Query(value =
        "SELECT COUNT(*) FROM messages " +
        "WHERE recipient_id = :recipientId AND sender_id = :senderId AND is_read = false " +
        "AND REGEXP_REPLACE(subject, '^(RE: |Re: |re: )*', '') = :baseSubject",
        nativeQuery = true)
    long countUnreadByThread(@Param("recipientId") Long recipientId, @Param("senderId") Long senderId, @Param("baseSubject") String baseSubject);

    /**
     * Mark all messages in a thread as read.
     */
    @Modifying
    @Query(value =
        "UPDATE messages SET is_read = true " +
        "WHERE recipient_id = :recipientId AND sender_id = :senderId AND is_read = false " +
        "AND REGEXP_REPLACE(subject, '^(RE: |Re: |re: )*', '') = :baseSubject",
        nativeQuery = true)
    void markThreadAsRead(@Param("recipientId") Long recipientId, @Param("senderId") Long senderId, @Param("baseSubject") String baseSubject);

    @Modifying
    @Query("UPDATE Message m SET m.read = true WHERE m.recipientId = :recipientId AND m.senderId = :senderId AND m.read = false")
    void markConversationAsRead(@Param("recipientId") Long recipientId, @Param("senderId") Long senderId);

    /**
     * Delete all messages in a specific thread between two users.
     */
    @Modifying
    @Query(value =
        "DELETE FROM messages WHERE " +
        "((sender_id = :userId AND recipient_id = :otherUserId) OR (sender_id = :otherUserId AND recipient_id = :userId)) " +
        "AND REGEXP_REPLACE(subject, '^(RE: |Re: |re: )*', '') = :baseSubject",
        nativeQuery = true)
    void deleteThread(@Param("userId") Long userId, @Param("otherUserId") Long otherUserId, @Param("baseSubject") String baseSubject);
}

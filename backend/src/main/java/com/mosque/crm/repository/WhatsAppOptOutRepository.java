package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.WhatsAppOptOut;

@Repository
public interface WhatsAppOptOutRepository extends JpaRepository<WhatsAppOptOut, Long> {

    Optional<WhatsAppOptOut> findByPhoneE164(String phoneE164);

    boolean existsByPhoneE164(String phoneE164);

    Optional<WhatsAppOptOut> findByChannelIdAndPhoneE164(Long channelId, String phoneE164);

    boolean existsByChannelIdAndPhoneE164(Long channelId, String phoneE164);

    /** Rows without a channel predate channels and are treated as a global stop. */
    boolean existsByPhoneE164AndChannelIdIsNull(String phoneE164);

    long countByChannelId(Long channelId);

    List<WhatsAppOptOut> findAllByOrderByCreatedAtDesc();
}

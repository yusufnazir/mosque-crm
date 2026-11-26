package com.mosque.crm.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.WhatsAppInboundMessage;

@Repository
public interface WhatsAppInboundRepository extends JpaRepository<WhatsAppInboundMessage, Long> {

    boolean existsByWaMessageId(String waMessageId);

    Optional<WhatsAppInboundMessage> findFirstByFromPhoneOrderByReceivedAtDesc(String fromPhone);

    List<WhatsAppInboundMessage> findAllByOrderByReceivedAtDesc(Pageable pageable);

    boolean existsByFromPhoneAndReceivedAtAfter(String fromPhone, LocalDateTime after);

    boolean existsByChannelIdAndFromPhoneAndReceivedAtAfter(Long channelId, String fromPhone, LocalDateTime after);

    long countByChannelId(Long channelId);
}

package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.WhatsAppChannel;

@Repository
public interface WhatsAppChannelRepository extends JpaRepository<WhatsAppChannel, Long> {

    List<WhatsAppChannel> findAllByOrderByDefaultChannelDescLabelAsc();

    Optional<WhatsAppChannel> findByWahaSession(String wahaSession);

    boolean existsByWahaSession(String wahaSession);

    boolean existsByWahaSessionAndIdNot(String wahaSession, Long id);

    /** The number a caller gets when it names none: an enabled default, else any enabled row. */
    Optional<WhatsAppChannel> findFirstByEnabledTrueOrderByDefaultChannelDescIdAsc();

    List<WhatsAppChannel> findByEnabledTrue();
}

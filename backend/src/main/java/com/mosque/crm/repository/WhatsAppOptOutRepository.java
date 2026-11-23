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

    List<WhatsAppOptOut> findAllByOrderByCreatedAtDesc();
}

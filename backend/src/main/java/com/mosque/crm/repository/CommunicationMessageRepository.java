package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.CommunicationMessage;

public interface CommunicationMessageRepository extends JpaRepository<CommunicationMessage, Long> {

    List<CommunicationMessage> findTop5ByOrderByCreatedAtDesc();

    Page<CommunicationMessage> findAllByOrderByCreatedAtDesc(Pageable pageable);
}

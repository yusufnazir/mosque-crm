package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.CommunicationTemplate;

public interface CommunicationTemplateRepository extends JpaRepository<CommunicationTemplate, Long> {

    List<CommunicationTemplate> findAllByOrderByNameAsc();
}

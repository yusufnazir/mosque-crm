package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.OrganizationMessageTemplate;

@Repository
public interface OrganizationMessageTemplateRepository extends JpaRepository<OrganizationMessageTemplate, Long> {

    List<OrganizationMessageTemplate> findByOrganizationIdOrderByTemplateKeyAscLanguageAsc(Long organizationId);

    Optional<OrganizationMessageTemplate> findByOrganizationIdAndTemplateKeyAndLanguage(
            Long organizationId, String templateKey, String language);

    void deleteByOrganizationIdAndTemplateKey(Long organizationId, String templateKey);

    void deleteByOrganizationIdAndTemplateKeyAndLanguage(Long organizationId, String templateKey, String language);
}

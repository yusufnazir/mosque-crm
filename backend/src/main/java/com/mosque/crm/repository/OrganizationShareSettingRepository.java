package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.OrganizationShareSetting;

@Repository
public interface OrganizationShareSettingRepository extends JpaRepository<OrganizationShareSetting, Long> {

    List<OrganizationShareSetting> findByPartnershipId(Long partnershipId);

    Optional<OrganizationShareSetting> findByPartnershipIdAndModuleKey(Long partnershipId, String moduleKey);
}

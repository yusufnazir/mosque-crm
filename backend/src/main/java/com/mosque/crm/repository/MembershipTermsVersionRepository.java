package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.MembershipTermsVersion;

public interface MembershipTermsVersionRepository extends JpaRepository<MembershipTermsVersion, Long> {

    List<MembershipTermsVersion> findByOrganizationIdOrderByVersionNumberDesc(Long organizationId);

    Optional<MembershipTermsVersion> findFirstByOrganizationIdAndActiveTrueOrderByVersionNumberDesc(Long organizationId);

    Optional<MembershipTermsVersion> findFirstByOrganizationIdOrderByVersionNumberDesc(Long organizationId);

    List<MembershipTermsVersion> findByOrganizationIdAndActiveTrue(Long organizationId);
}
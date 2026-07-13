package com.mosque.crm.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.OrganizationPartnership;

@Repository
public interface OrganizationPartnershipRepository extends JpaRepository<OrganizationPartnership, Long> {

    List<OrganizationPartnership> findByParentOrganizationIdOrMemberOrganizationId(
            Long parentOrganizationId, Long memberOrganizationId);

    Optional<OrganizationPartnership> findByParentOrganizationIdAndMemberOrganizationId(
            Long parentOrganizationId, Long memberOrganizationId);

    boolean existsByMemberOrganizationIdAndStatusIn(Long memberOrganizationId, Collection<String> statuses);

    List<OrganizationPartnership> findByParentOrganizationIdAndStatus(Long parentOrganizationId, String status);

    List<OrganizationPartnership> findByMemberOrganizationIdAndStatus(Long memberOrganizationId, String status);

    Optional<OrganizationPartnership> findFirstByMemberOrganizationIdAndStatus(
            Long memberOrganizationId, String status);
}

package com.mosque.crm.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.GeneralEvent;
import com.mosque.crm.enums.GeneralEventStatus;

@Repository
public interface GeneralEventRepository extends JpaRepository<GeneralEvent, Long> {

    List<GeneralEvent> findAllByOrderByStartDateDescCreatedAtDesc();

    List<GeneralEvent> findByStatusOrderByStartDateDesc(GeneralEventStatus status);

    @Query("""
            SELECT e FROM GeneralEvent e
            JOIN OrganizationPartnership p ON p.memberOrganizationId = e.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND e.status IN ('PUBLISHED', 'ACTIVE')
              AND e.visibility IN ('PUBLIC', 'SHARED_WITH_FEDERATION')
              AND COALESCE(e.endDate, e.startDate) >= :today
            ORDER BY e.startDate ASC, e.startTime ASC
            """)
    List<GeneralEvent> findFederationEventsForParent(
            @Param("parentOrgId") Long parentOrgId,
            @Param("moduleKey") String moduleKey,
            @Param("today") LocalDate today);

    @Query("""
            SELECT e FROM GeneralEvent e
            JOIN OrganizationPartnership p ON p.memberOrganizationId = e.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.memberOrganizationId <> :viewerOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND ss.shareLevel IN ('SIBLINGS', 'PUBLIC')
              AND e.status IN ('PUBLISHED', 'ACTIVE')
              AND e.visibility IN ('PUBLIC', 'SHARED_WITH_FEDERATION')
              AND e.federationHidden = false
              AND COALESCE(e.endDate, e.startDate) >= :today
            ORDER BY e.startDate ASC, e.startTime ASC
            """)
    List<GeneralEvent> findFederationEventsForSibling(
            @Param("parentOrgId") Long parentOrgId,
            @Param("viewerOrgId") Long viewerOrgId,
            @Param("moduleKey") String moduleKey,
            @Param("today") LocalDate today);

    @Query("""
            SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END
            FROM OrganizationPartnership p
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.memberOrganizationId = :memberOrgId
              AND p.status = 'ACTIVE'
            """)
    boolean existsActivePartnership(
            @Param("parentOrgId") Long parentOrgId,
            @Param("memberOrgId") Long memberOrgId);
}

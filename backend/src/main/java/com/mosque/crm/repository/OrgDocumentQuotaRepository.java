package com.mosque.crm.repository;

import com.mosque.crm.entity.OrgDocumentQuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrgDocumentQuotaRepository extends JpaRepository<OrgDocumentQuota, Long> {

    Optional<OrgDocumentQuota> findByOrganizationId(Long organizationId);

    @Modifying
    @Query("UPDATE OrgDocumentQuota q SET q.storageUsedBytes = q.storageUsedBytes + :bytes WHERE q.organizationId = :orgId")
    void incrementStorage(@Param("orgId") Long orgId, @Param("bytes") long bytes);

    @Modifying
    @Query("UPDATE OrgDocumentQuota q SET q.storageUsedBytes = GREATEST(0, q.storageUsedBytes - :bytes) WHERE q.organizationId = :orgId")
    void decrementStorage(@Param("orgId") Long orgId, @Param("bytes") long bytes);

    @Modifying
    @Query("UPDATE OrgDocumentQuota q SET q.bandwidthUsedBytes = q.bandwidthUsedBytes + :bytes WHERE q.organizationId = :orgId")
    void incrementBandwidth(@Param("orgId") Long orgId, @Param("bytes") long bytes);
}

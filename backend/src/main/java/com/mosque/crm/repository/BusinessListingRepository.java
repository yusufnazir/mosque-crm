package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mosque.crm.entity.Business;
import com.mosque.crm.entity.BusinessListing;

@Repository
public interface BusinessListingRepository extends JpaRepository<BusinessListing, Long> {

    Optional<BusinessListing> findByBusinessId(Long businessId);

    List<BusinessListing> findByOrganizationId(Long organizationId);

    List<BusinessListing> findByOrganizationIdAndStatusOrderBySubmittedAtDesc(
            Long organizationId, String status);

    List<BusinessListing> findByOrganizationIdAndStatusAndPublicVisibleTrueOrderByPublishedAtDesc(
            Long organizationId, String status);

    @Query(value = """
            SELECT b FROM Business b, BusinessListing bl
            WHERE bl.businessId = b.id
              AND bl.organizationId = :orgId
              AND bl.status = :status
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """,
            countQuery = """
            SELECT COUNT(b) FROM Business b, BusinessListing bl
            WHERE bl.businessId = b.id
              AND bl.organizationId = :orgId
              AND bl.status = :status
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """)
    Page<Business> searchPublishedBusinesses(
            @Param("orgId") Long orgId,
            @Param("status") String status,
            @Param("search") String search,
            @Param("category") String category,
            Pageable pageable);

    @Query(value = """
            SELECT b FROM Business b, BusinessListing bl
            WHERE bl.businessId = b.id
              AND bl.organizationId = :orgId
              AND bl.status = :status
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """,
            countQuery = """
            SELECT COUNT(b) FROM Business b, BusinessListing bl
            WHERE bl.businessId = b.id
              AND bl.organizationId = :orgId
              AND bl.status = :status
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """)
    Page<Business> searchPublicBusinesses(
            @Param("orgId") Long orgId,
            @Param("status") String status,
            @Param("search") String search,
            @Param("category") String category,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT b.category FROM Business b, BusinessListing bl
            WHERE bl.businessId = b.id
              AND bl.organizationId = :orgId
              AND bl.status = :status
              AND b.category IS NOT NULL
              AND b.category <> ''
            ORDER BY b.category ASC
            """)
    List<String> findPublishedCategories(
            @Param("orgId") Long orgId,
            @Param("status") String status);

    @Query("""
            SELECT DISTINCT b.category FROM Business b, BusinessListing bl
            WHERE bl.businessId = b.id
              AND bl.organizationId = :orgId
              AND bl.status = :status
              AND b.category IS NOT NULL
              AND b.category <> ''
            ORDER BY b.category ASC
            """)
    List<String> findPublicCategories(
            @Param("orgId") Long orgId,
            @Param("status") String status);

    @Query("""
            SELECT bl FROM BusinessListing bl
            JOIN OrganizationPartnership p ON p.memberOrganizationId = bl.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND bl.status = 'PUBLISHED'
              """)
    List<BusinessListing> findFederationListingsForParent(
            @Param("parentOrgId") Long parentOrgId,
            @Param("moduleKey") String moduleKey);

    @Query("""
            SELECT bl FROM BusinessListing bl
            JOIN OrganizationPartnership p ON p.memberOrganizationId = bl.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.memberOrganizationId <> :viewerOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND ss.shareLevel IN ('SIBLINGS', 'PUBLIC')
              AND bl.status = 'PUBLISHED'
              AND bl.federationHidden = false
            """)
    List<BusinessListing> findFederationListingsForSibling(
            @Param("parentOrgId") Long parentOrgId,
            @Param("viewerOrgId") Long viewerOrgId,
            @Param("moduleKey") String moduleKey);

    @Query(value = """
            SELECT bl FROM BusinessListing bl
            JOIN Business b ON b.id = bl.businessId
            JOIN OrganizationPartnership p ON p.memberOrganizationId = bl.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND bl.status = 'PUBLISHED'
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            ORDER BY LOWER(b.name) ASC
            """,
            countQuery = """
            SELECT COUNT(bl) FROM BusinessListing bl
            JOIN Business b ON b.id = bl.businessId
            JOIN OrganizationPartnership p ON p.memberOrganizationId = bl.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND bl.status = 'PUBLISHED'
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """)
    Page<BusinessListing> searchFederationListingsForParent(
            @Param("parentOrgId") Long parentOrgId,
            @Param("moduleKey") String moduleKey,
            @Param("search") String search,
            @Param("category") String category,
            Pageable pageable);

    @Query(value = """
            SELECT bl FROM BusinessListing bl
            JOIN Business b ON b.id = bl.businessId
            JOIN OrganizationPartnership p ON p.memberOrganizationId = bl.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.memberOrganizationId <> :viewerOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND ss.shareLevel IN ('SIBLINGS', 'PUBLIC')
              AND bl.status = 'PUBLISHED'
              AND bl.federationHidden = false
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            ORDER BY LOWER(b.name) ASC
            """,
            countQuery = """
            SELECT COUNT(bl) FROM BusinessListing bl
            JOIN Business b ON b.id = bl.businessId
            JOIN OrganizationPartnership p ON p.memberOrganizationId = bl.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.memberOrganizationId <> :viewerOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND ss.shareLevel IN ('SIBLINGS', 'PUBLIC')
              AND bl.status = 'PUBLISHED'
              AND bl.federationHidden = false
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """)
    Page<BusinessListing> searchFederationListingsForSibling(
            @Param("parentOrgId") Long parentOrgId,
            @Param("viewerOrgId") Long viewerOrgId,
            @Param("moduleKey") String moduleKey,
            @Param("search") String search,
            @Param("category") String category,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT b.category FROM BusinessListing bl
            JOIN Business b ON b.id = bl.businessId
            JOIN OrganizationPartnership p ON p.memberOrganizationId = bl.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND bl.status = 'PUBLISHED'
              AND b.category IS NOT NULL
              AND b.category <> ''
            ORDER BY b.category ASC
            """)
    List<String> findFederationCategoriesForParent(
            @Param("parentOrgId") Long parentOrgId,
            @Param("moduleKey") String moduleKey);

    @Query("""
            SELECT DISTINCT b.category FROM BusinessListing bl
            JOIN Business b ON b.id = bl.businessId
            JOIN OrganizationPartnership p ON p.memberOrganizationId = bl.organizationId
            JOIN OrganizationShareSetting ss ON ss.partnershipId = p.id
            WHERE p.parentOrganizationId = :parentOrgId
              AND p.memberOrganizationId <> :viewerOrgId
              AND p.status = 'ACTIVE'
              AND ss.moduleKey = :moduleKey
              AND ss.enabled = true
              AND ss.shareLevel IN ('SIBLINGS', 'PUBLIC')
              AND bl.status = 'PUBLISHED'
              AND bl.federationHidden = false
              AND b.category IS NOT NULL
              AND b.category <> ''
            ORDER BY b.category ASC
            """)
    List<String> findFederationCategoriesForSibling(
            @Param("parentOrgId") Long parentOrgId,
            @Param("viewerOrgId") Long viewerOrgId,
            @Param("moduleKey") String moduleKey);

    /**
     * Parent public directory: own published listings plus member-org listings shared to this parent.
     */
    @Query(value = """
            SELECT bl FROM BusinessListing bl
            JOIN Business b ON b.id = bl.businessId
            WHERE bl.status = 'PUBLISHED'
              AND (
                bl.organizationId = :parentOrgId
                OR (
                  bl.federationHidden = false
                  AND EXISTS (
                    SELECT 1 FROM OrganizationPartnership p, OrganizationShareSetting ss
                    WHERE ss.partnershipId = p.id
                      AND p.memberOrganizationId = bl.organizationId
                      AND p.parentOrganizationId = :parentOrgId
                      AND p.status = 'ACTIVE'
                      AND ss.moduleKey = :moduleKey
                      AND ss.enabled = true
                  )
                )
              )
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            ORDER BY LOWER(b.name) ASC
            """,
            countQuery = """
            SELECT COUNT(bl) FROM BusinessListing bl
            JOIN Business b ON b.id = bl.businessId
            WHERE bl.status = 'PUBLISHED'
              AND (
                bl.organizationId = :parentOrgId
                OR (
                  bl.federationHidden = false
                  AND EXISTS (
                    SELECT 1 FROM OrganizationPartnership p, OrganizationShareSetting ss
                    WHERE ss.partnershipId = p.id
                      AND p.memberOrganizationId = bl.organizationId
                      AND p.parentOrganizationId = :parentOrgId
                      AND p.status = 'ACTIVE'
                      AND ss.moduleKey = :moduleKey
                      AND ss.enabled = true
                  )
                )
              )
              AND (:category IS NULL OR b.category = :category)
              AND (
                :search IS NULL OR
                LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.description, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.city, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.country, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.category, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR
                LOWER(COALESCE(b.email, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
            """)
    Page<BusinessListing> searchPublicDirectoryForParent(
            @Param("parentOrgId") Long parentOrgId,
            @Param("moduleKey") String moduleKey,
            @Param("search") String search,
            @Param("category") String category,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT b.category FROM BusinessListing bl
            JOIN Business b ON b.id = bl.businessId
            WHERE bl.status = 'PUBLISHED'
              AND (
                bl.organizationId = :parentOrgId
                OR (
                  bl.federationHidden = false
                  AND EXISTS (
                    SELECT 1 FROM OrganizationPartnership p, OrganizationShareSetting ss
                    WHERE ss.partnershipId = p.id
                      AND p.memberOrganizationId = bl.organizationId
                      AND p.parentOrganizationId = :parentOrgId
                      AND p.status = 'ACTIVE'
                      AND ss.moduleKey = :moduleKey
                      AND ss.enabled = true
                  )
                )
              )
              AND b.category IS NOT NULL
              AND b.category <> ''
            ORDER BY b.category ASC
            """)
    List<String> findPublicCategoriesForParent(
            @Param("parentOrgId") Long parentOrgId,
            @Param("moduleKey") String moduleKey);

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

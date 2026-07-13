package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.mosque.crm.config.StorageProperties;
import com.mosque.crm.dto.BusinessDTO;
import com.mosque.crm.dto.BusinessDirectoryPageResponse;
import com.mosque.crm.dto.BusinessListingDTO;
import com.mosque.crm.dto.FederatedBusinessListingDTO;
import com.mosque.crm.dto.PublicBusinessDTO;
import com.mosque.crm.dto.PublicBusinessDirectoryResponse;
import com.mosque.crm.dto.PublicBusinessSitemapEntryDTO;
import com.mosque.crm.entity.Business;
import com.mosque.crm.entity.BusinessListing;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.OrganizationPartnership;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserMemberLink;
import com.mosque.crm.federation.FederationConstants;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.BusinessListingRepository;
import com.mosque.crm.repository.BusinessRepository;
import com.mosque.crm.repository.OrganizationPartnershipRepository;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.OrganizationShareSettingRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.UserMemberLinkRepository;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanLimitExceededException;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

@Service
@Transactional
public class BusinessDirectoryService {

    private static final Logger log = LoggerFactory.getLogger(BusinessDirectoryService.class);

    private final BusinessRepository businessRepository;
    private final BusinessListingRepository businessListingRepository;
    private final PersonRepository personRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationPartnershipRepository partnershipRepository;
    private final OrganizationShareSettingRepository shareSettingRepository;
    private final UserMemberLinkRepository userMemberLinkRepository;
    private final AuthorizationService authorizationService;
    private final FederationNotificationService federationNotificationService;
    private final TenantSettingService tenantSettingService;
    private final BusinessCategoryService businessCategoryService;
    private final OrganizationSubscriptionService organizationSubscriptionService;
    private final StorageService storageService;
    private final StorageProperties storageProperties;

    public BusinessDirectoryService(
            BusinessRepository businessRepository,
            BusinessListingRepository businessListingRepository,
            PersonRepository personRepository,
            OrganizationRepository organizationRepository,
            OrganizationPartnershipRepository partnershipRepository,
            OrganizationShareSettingRepository shareSettingRepository,
            UserMemberLinkRepository userMemberLinkRepository,
            AuthorizationService authorizationService,
            FederationNotificationService federationNotificationService,
            TenantSettingService tenantSettingService,
            BusinessCategoryService businessCategoryService,
            OrganizationSubscriptionService organizationSubscriptionService,
            StorageService storageService,
            StorageProperties storageProperties) {
        this.businessRepository = businessRepository;
        this.businessListingRepository = businessListingRepository;
        this.personRepository = personRepository;
        this.organizationRepository = organizationRepository;
        this.partnershipRepository = partnershipRepository;
        this.shareSettingRepository = shareSettingRepository;
        this.userMemberLinkRepository = userMemberLinkRepository;
        this.authorizationService = authorizationService;
        this.federationNotificationService = federationNotificationService;
        this.tenantSettingService = tenantSettingService;
        this.businessCategoryService = businessCategoryService;
        this.organizationSubscriptionService = organizationSubscriptionService;
        this.storageService = storageService;
        this.storageProperties = storageProperties;
    }

    public List<BusinessDTO> listLocalBusinesses() {
        requireViewPermission();
        Long orgId = requireOrganizationId();
        return businessRepository.findByOrganizationIdOrderByNameAsc(orgId)
                .stream()
                .map(this::toBusinessDto)
                .collect(Collectors.toList());
    }

    /** Org-wide listing count vs plan limit (null limit = unlimited). */
    public Map<String, Object> getListingUsage() {
        requireViewOrRegisterPermission();
        Long orgId = requireOrganizationId();
        long count = businessRepository.countByOrganizationId(orgId);
        Integer limit = null;
        try {
            limit = organizationSubscriptionService.getFeatureLimit(orgId, FeatureKeys.BUSINESS_DIRECTORY);
        } catch (RuntimeException ex) {
            log.debug("Listing usage limit lookup failed for org {}: {}", orgId, ex.getMessage());
        }
        Map<String, Object> usage = new LinkedHashMap<>();
        usage.put("count", count);
        usage.put("limit", limit);
        return usage;
    }

    public List<BusinessDTO> listPublishedBusinesses() {
        requireViewPermission();
        Long orgId = requireOrganizationId();
        return businessListingRepository
                .findByOrganizationIdAndStatusOrderBySubmittedAtDesc(
                        orgId, BusinessListing.Status.PUBLISHED.name())
                .stream()
                .map(listing -> businessRepository.findById(listing.getBusinessId()).orElse(null))
                .filter(b -> b != null)
                .sorted(Comparator.comparing(Business::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toBusinessDto)
                .collect(Collectors.toList());
    }

    public BusinessDirectoryPageResponse<BusinessDTO> listPublishedBusinessesPaged(
            int page, int size, String search, String category) {
        requireViewPermission();
        Long orgId = requireOrganizationId();
        int safeSize = clampPageSize(size);
        int safePage = Math.max(page, 0);
        String searchTerm = normalizeFilter(search);
        String categoryTerm = normalizeFilter(category);

        Page<Business> result = businessListingRepository.searchPublishedBusinesses(
                orgId,
                BusinessListing.Status.PUBLISHED.name(),
                searchTerm,
                categoryTerm,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Order.asc("name").ignoreCase())));

        List<String> categories = businessListingRepository.findPublishedCategories(
                orgId, BusinessListing.Status.PUBLISHED.name());

        return new BusinessDirectoryPageResponse<>(
                result.getContent().stream().map(this::toBusinessDto).collect(Collectors.toList()),
                safePage,
                safeSize,
                result.getTotalElements(),
                categories);
    }

    public BusinessDirectoryPageResponse<FederatedBusinessListingDTO> listFederationDirectoryPaged(
            int page, int size, String search, String category) {
        requireViewPermission();
        Long orgId = requireOrganizationId();
        int safeSize = clampPageSize(size);
        int safePage = Math.max(page, 0);
        String searchTerm = normalizeFilter(search);
        String categoryTerm = normalizeFilter(category);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        return authorizationService.withoutOrganizationFilter(() -> {
            boolean isParent = !partnershipRepository
                    .findByParentOrganizationIdAndStatus(orgId, OrganizationPartnership.Status.ACTIVE.name())
                    .isEmpty();

            Page<BusinessListing> result;
            List<String> categories;
            if (isParent) {
                result = businessListingRepository.searchFederationListingsForParent(
                        orgId,
                        FederationConstants.MODULE_BUSINESS_DIRECTORY,
                        searchTerm,
                        categoryTerm,
                        pageable);
                categories = businessListingRepository.findFederationCategoriesForParent(
                        orgId, FederationConstants.MODULE_BUSINESS_DIRECTORY);
            } else {
                var partnershipOpt = partnershipRepository.findFirstByMemberOrganizationIdAndStatus(
                        orgId, OrganizationPartnership.Status.ACTIVE.name());
                if (partnershipOpt.isEmpty()) {
                    return new BusinessDirectoryPageResponse<>(
                            List.of(), safePage, safeSize, 0L, List.of());
                }
                Long parentOrgId = partnershipOpt.get().getParentOrganizationId();
                result = businessListingRepository.searchFederationListingsForSibling(
                        parentOrgId,
                        orgId,
                        FederationConstants.MODULE_BUSINESS_DIRECTORY,
                        searchTerm,
                        categoryTerm,
                        pageable);
                categories = businessListingRepository.findFederationCategoriesForSibling(
                        parentOrgId, orgId, FederationConstants.MODULE_BUSINESS_DIRECTORY);
            }

            List<FederatedBusinessListingDTO> content = result.getContent().stream()
                    .map(this::toFederatedDto)
                    .collect(Collectors.toList());
            return new BusinessDirectoryPageResponse<>(
                    content,
                    safePage,
                    safeSize,
                    result.getTotalElements(),
                    categories);
        });
    }

    public List<BusinessDTO> listMyBusinesses() {
        requireRegisterOwnPermission();
        Long orgId = requireOrganizationId();
        Long personId = requireLinkedPersonId();
        return businessRepository.findByOrganizationIdAndOwnerPersonIdOrderByNameAsc(orgId, personId)
                .stream()
                .map(this::toBusinessDto)
                .collect(Collectors.toList());
    }

    public List<BusinessDTO> listPendingApprovals() {
        requireApprovePermission();
        Long orgId = requireOrganizationId();
        return businessListingRepository
                .findByOrganizationIdAndStatusOrderBySubmittedAtDesc(
                        orgId, BusinessListing.Status.PENDING_APPROVAL.name())
                .stream()
                .map(listing -> businessRepository.findById(listing.getBusinessId()).orElse(null))
                .filter(b -> b != null)
                .map(this::toBusinessDto)
                .collect(Collectors.toList());
    }

    public PublicBusinessDirectoryResponse listPublicDirectory(
            String orgHandle, int page, int size, String search, String category) {
        Organization organization = organizationRepository.findByHandle(orgHandle.trim())
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + orgHandle));

        PublicBusinessDirectoryResponse response = new PublicBusinessDirectoryResponse();
        response.setOrganizationName(organization.getName());

        int safeSize = clampPageSize(size);
        int safePage = Math.max(page, 0);

        if (!isPublicDirectoryAvailable(organization.getId())) {
            response.setEnabled(false);
            response.applyPageMeta(safePage, safeSize, 0);
            return response;
        }

        response.setEnabled(true);
        Long orgId = organization.getId();
        String searchTerm = normalizeFilter(search);
        String categoryTerm = normalizeFilter(category);
        String handle = orgHandle.trim();

        return authorizationService.withoutOrganizationFilter(() -> {
            boolean isParent = !partnershipRepository
                    .findByParentOrganizationIdAndStatus(orgId, OrganizationPartnership.Status.ACTIVE.name())
                    .isEmpty();
            response.setIncludesFederationListings(isParent);

            if (isParent) {
                Pageable pageable = PageRequest.of(safePage, safeSize);
                Page<BusinessListing> result = businessListingRepository.searchPublicDirectoryForParent(
                        orgId,
                        FederationConstants.MODULE_BUSINESS_DIRECTORY,
                        searchTerm,
                        categoryTerm,
                        pageable);
                List<String> categories = businessListingRepository.findPublicCategoriesForParent(
                        orgId, FederationConstants.MODULE_BUSINESS_DIRECTORY);
                response.setBusinesses(result.getContent().stream()
                        .map(this::toPublicBusinessDtoFromListing)
                        .collect(Collectors.toList()));
                response.setAvailableCategories(categories);
                response.applyPageMeta(safePage, safeSize, result.getTotalElements());
                return response;
            }

            Page<Business> result = businessListingRepository.searchPublicBusinesses(
                    orgId,
                    BusinessListing.Status.PUBLISHED.name(),
                    searchTerm,
                    categoryTerm,
                    PageRequest.of(safePage, safeSize, Sort.by(Sort.Order.asc("name").ignoreCase())));

            List<String> categories = businessListingRepository.findPublicCategories(
                    orgId, BusinessListing.Status.PUBLISHED.name());

            response.setBusinesses(result.getContent().stream()
                    .map(b -> toPublicBusinessDto(b, handle))
                    .collect(Collectors.toList()));
            response.setAvailableCategories(categories);
            response.applyPageMeta(safePage, safeSize, result.getTotalElements());
            return response;
        });
    }

    public PublicBusinessDTO getPublicBusiness(String orgHandle, Long businessId) {
        Organization organization = organizationRepository.findByHandle(orgHandle.trim())
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + orgHandle));
        if (!isPublicDirectoryAvailable(organization.getId())) {
            throw new AccessDeniedException("Public directory is not enabled.");
        }
        Long hostOrgId = organization.getId();
        return authorizationService.withoutOrganizationFilter(() -> {
            Business business = businessRepository.findById(businessId)
                    .orElseThrow(() -> new IllegalArgumentException("Business not found: " + businessId));
            BusinessListing listing = businessListingRepository.findByBusinessId(businessId)
                    .orElseThrow(() -> new IllegalArgumentException("Listing not found"));
            if (!BusinessListing.Status.PUBLISHED.name().equals(listing.getStatus())) {
                throw new AccessDeniedException("Business is not publicly visible.");
            }
            if (hostOrgId.equals(business.getOrganizationId())) {
                return toPublicBusinessDtoFromListing(listing);
            }
            boolean isParent = !partnershipRepository
                    .findByParentOrganizationIdAndStatus(hostOrgId, OrganizationPartnership.Status.ACTIVE.name())
                    .isEmpty();
            if (!isParent || listing.isFederationHidden()) {
                throw new AccessDeniedException("Business is not publicly visible on this directory.");
            }
            boolean shared = businessListingRepository.existsActivePartnership(hostOrgId, business.getOrganizationId())
                    && shareSettingEnabled(hostOrgId, business.getOrganizationId());
            if (!shared) {
                throw new AccessDeniedException("Business is not publicly visible on this directory.");
            }
            return toPublicBusinessDtoFromListing(listing);
        });
    }

    public List<PublicBusinessSitemapEntryDTO> listPublicSitemapEntries(String orgHandle) {
        Organization organization = organizationRepository.findByHandle(orgHandle.trim())
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + orgHandle));
        if (!isPublicDirectoryAvailable(organization.getId())) {
            return List.of();
        }
        Long orgId = organization.getId();
        return authorizationService.withoutOrganizationFilter(() -> {
            boolean isParent = !partnershipRepository
                    .findByParentOrganizationIdAndStatus(orgId, OrganizationPartnership.Status.ACTIVE.name())
                    .isEmpty();
            List<BusinessListing> listings;
            if (isParent) {
                listings = businessListingRepository.searchPublicDirectoryForParent(
                                orgId,
                                FederationConstants.MODULE_BUSINESS_DIRECTORY,
                                null,
                                null,
                                Pageable.unpaged())
                        .getContent();
            } else {
                listings = businessListingRepository.findByOrganizationIdAndStatusOrderBySubmittedAtDesc(
                        orgId, BusinessListing.Status.PUBLISHED.name());
            }
            return listings.stream()
                    .map(listing -> {
                        Business business = businessRepository.findById(listing.getBusinessId()).orElse(null);
                        if (business == null) {
                            return null;
                        }
                        return new PublicBusinessSitemapEntryDTO(
                                business.getId(),
                                business.getName(),
                                business.getUpdatedAt() != null ? business.getUpdatedAt() : listing.getPublishedAt());
                    })
                    .filter(e -> e != null)
                    .sorted((a, b) -> String.CASE_INSENSITIVE_ORDER.compare(
                            a.getName() != null ? a.getName() : "",
                            b.getName() != null ? b.getName() : ""))
                    .collect(Collectors.toList());
        });
    }

    private boolean shareSettingEnabled(Long parentOrgId, Long memberOrgId) {
        return partnershipRepository
                .findByParentOrganizationIdAndStatus(parentOrgId, OrganizationPartnership.Status.ACTIVE.name())
                .stream()
                .filter(p -> memberOrgId.equals(p.getMemberOrganizationId()))
                .findFirst()
                .map(p -> shareSettingRepository
                        .findByPartnershipIdAndModuleKey(p.getId(), FederationConstants.MODULE_BUSINESS_DIRECTORY)
                        .map(ss -> ss.isEnabled())
                        .orElse(false))
                .orElse(false);
    }

    public BusinessDTO getBusiness(Long id) {
        requireViewPermission();
        return toBusinessDto(getBusinessForCurrentOrg(id));
    }

    public BusinessDTO createBusiness(BusinessDTO dto) {
        requireManagePermission();
        return createBusinessInternal(dto, dto.getOwnerPersonId(), false);
    }

    public BusinessDTO createMyBusiness(BusinessDTO dto) {
        requireRegisterOwnPermission();
        Long personId = requireLinkedPersonId();
        return createBusinessInternal(dto, personId, true);
    }

    public BusinessDTO updateBusiness(Long id, BusinessDTO dto) {
        requireManagePermission();
        Business business = getBusinessForCurrentOrg(id);
        assertAdminMayEditContent(business);
        applyBusinessFields(business, dto);
        validateOwnerPerson(business.getOwnerPersonId(), business.getOrganizationId());
        return toBusinessDto(businessRepository.save(business));
    }

    public BusinessDTO updateMyBusiness(Long id, BusinessDTO dto) {
        requireRegisterOwnPermission();
        Business business = getOwnBusiness(id);
        BusinessListing listing = getListingForBusiness(business.getId());
        boolean wasPublished = BusinessListing.Status.PUBLISHED.name().equals(listing.getStatus());
        applyBusinessFields(business, dto);
        business.setOwnerPersonId(requireLinkedPersonId());
        business = businessRepository.save(business);

        if (wasPublished) {
            // Content changes on a live listing require re-approval.
            listing.setStatus(BusinessListing.Status.PENDING_APPROVAL.name());
            listing.setSubmittedAt(LocalDateTime.now());
            listing.setVisibility(BusinessListing.Visibility.LOCAL_ONLY.name());
            listing.setPublicVisible(false);
            listing.setRejectionReason(null);
            clearSuspension(listing);
            businessListingRepository.save(listing);
            federationNotificationService.notifyBusinessSubmittedForApproval(
                    business.getOrganizationId(), business.getName());
        }
        return toBusinessDto(business);
    }

    public BusinessDTO submitMyBusinessForApproval(Long id) {
        requireRegisterOwnPermission();
        Business business = getOwnBusiness(id);
        BusinessListing listing = getListingForBusiness(business.getId());
        if (!BusinessListing.Status.DRAFT.name().equals(listing.getStatus())
                && !BusinessListing.Status.SUSPENDED.name().equals(listing.getStatus())
                && !BusinessListing.Status.PENDING_APPROVAL.name().equals(listing.getStatus())) {
            throw new IllegalStateException("Only draft or suspended listings can be submitted for approval.");
        }
        listing.setStatus(BusinessListing.Status.PENDING_APPROVAL.name());
        listing.setSubmittedAt(LocalDateTime.now());
        listing.setRejectionReason(null);
        clearSuspension(listing);
        businessListingRepository.save(listing);
        federationNotificationService.notifyBusinessSubmittedForApproval(business.getOrganizationId(), business.getName());
        return toBusinessDto(business);
    }

    public BusinessDTO approveBusiness(Long id) {
        requireApprovePermission();
        Business business = getBusinessForCurrentOrg(id);
        BusinessListing listing = getListingForBusiness(business.getId());
        if (!BusinessListing.Status.PENDING_APPROVAL.name().equals(listing.getStatus())) {
            throw new IllegalStateException("Business is not pending approval.");
        }
        listing.setStatus(BusinessListing.Status.PUBLISHED.name());
        listing.setVisibility(BusinessListing.Visibility.SHARED_WITH_FEDERATION.name());
        listing.setPublicVisible(true);
        listing.setPublishedAt(LocalDateTime.now());
        listing.setReviewedAt(LocalDateTime.now());
        listing.setReviewedByUserId(currentUserId());
        listing.setRejectionReason(null);
        clearSuspension(listing);
        businessListingRepository.save(listing);
        notifyOwnerListingDecision(business, true, null);
        return toBusinessDto(business);
    }

    public BusinessDTO rejectBusiness(Long id, String reason) {
        requireApprovePermission();
        String trimmedReason = requireNonBlankReason(reason, "A rejection reason is required.");
        Business business = getBusinessForCurrentOrg(id);
        BusinessListing listing = getListingForBusiness(business.getId());
        if (!BusinessListing.Status.PENDING_APPROVAL.name().equals(listing.getStatus())) {
            throw new IllegalStateException("Business is not pending approval.");
        }
        listing.setStatus(BusinessListing.Status.DRAFT.name());
        listing.setVisibility(BusinessListing.Visibility.LOCAL_ONLY.name());
        listing.setPublicVisible(false);
        listing.setReviewedAt(LocalDateTime.now());
        listing.setReviewedByUserId(currentUserId());
        listing.setRejectionReason(trimmedReason);
        clearSuspension(listing);
        businessListingRepository.save(listing);
        notifyOwnerListingDecision(business, false, trimmedReason);
        return toBusinessDto(business);
    }

    public BusinessDTO suspendBusiness(Long id, String reason) {
        requireApproveOrManagePermission();
        String trimmedReason = requireNonBlankReason(reason, "A suspension reason is required.");
        Business business = getBusinessForCurrentOrg(id);
        if (business.getOwnerPersonId() == null) {
            throw new IllegalStateException("Organization-owned listings cannot be suspended; unpublish or delete them instead.");
        }
        BusinessListing listing = getListingForBusiness(business.getId());
        if (!BusinessListing.Status.PUBLISHED.name().equals(listing.getStatus())) {
            throw new IllegalStateException("Only published listings can be suspended.");
        }
        listing.setStatus(BusinessListing.Status.SUSPENDED.name());
        listing.setPublicVisible(false);
        listing.setVisibility(BusinessListing.Visibility.LOCAL_ONLY.name());
        listing.setSuspensionReason(trimmedReason);
        listing.setSuspendedAt(LocalDateTime.now());
        listing.setSuspendedByUserId(currentUserId());
        listing.setReviewedAt(LocalDateTime.now());
        listing.setReviewedByUserId(currentUserId());
        businessListingRepository.save(listing);
        notifyOwnerListingSuspended(business, trimmedReason);
        return toBusinessDto(business);
    }

    public void deleteBusiness(Long id) {
        requireManagePermission();
        Business business = getBusinessForCurrentOrg(id);
        assertAdminMayEditContent(business);
        deleteBusinessInternal(business);
    }

    public void deleteMyBusiness(Long id) {
        requireRegisterOwnPermission();
        Business business = getOwnBusiness(id);
        BusinessListing listing = getListingForBusiness(business.getId());
        if (BusinessListing.Status.PENDING_APPROVAL.name().equals(listing.getStatus())) {
            throw new IllegalStateException("Listings pending approval cannot be deleted. Wait for a decision or ask an admin.");
        }
        deleteBusinessInternal(business);
    }

    public BusinessListingDTO updateListing(Long businessId, BusinessListingDTO dto) {
        requireManagePermission();
        Business business = getBusinessForCurrentOrg(businessId);
        if (isMemberOwned(business) && dto.getStatus() != null) {
            throw new IllegalStateException(
                    "Member listings cannot be unpublished directly. Suspend them with a required reason instead.");
        }
        return updateListingInternal(business, dto, true);
    }

    public BusinessListingDTO updateMyListing(Long businessId, BusinessListingDTO dto) {
        requireRegisterOwnPermission();
        // Per-listing partner/public toggles removed: publish status is the only gate.
        getOwnBusiness(businessId);
        throw new IllegalStateException(
                "Per-listing visibility settings are no longer used. Published listings are visible "
                        + "in the org directory, on the public website when enabled, and in the federation "
                        + "when this organization shares the business directory module.");
    }

    public List<FederatedBusinessListingDTO> listFederationDirectory() {
        requireViewPermission();
        Long orgId = requireOrganizationId();
        List<BusinessListing> listings = authorizationService.withoutOrganizationFilter(() -> {
            List<BusinessListing> results = new ArrayList<>();
            boolean isParent = !partnershipRepository
                    .findByParentOrganizationIdAndStatus(orgId, OrganizationPartnership.Status.ACTIVE.name())
                    .isEmpty();

            if (isParent) {
                results.addAll(businessListingRepository.findFederationListingsForParent(
                        orgId, FederationConstants.MODULE_BUSINESS_DIRECTORY));
            } else {
                partnershipRepository.findFirstByMemberOrganizationIdAndStatus(
                        orgId, OrganizationPartnership.Status.ACTIVE.name())
                        .ifPresent(partnership -> results.addAll(
                                businessListingRepository.findFederationListingsForSibling(
                                        partnership.getParentOrganizationId(),
                                        orgId,
                                        FederationConstants.MODULE_BUSINESS_DIRECTORY)));
            }
            return results;
        });

        boolean isParent = !partnershipRepository
                .findByParentOrganizationIdAndStatus(orgId, OrganizationPartnership.Status.ACTIVE.name())
                .isEmpty();

        return authorizationService.withoutOrganizationFilter(() -> listings.stream()
                .distinct()
                .filter(listing -> isParent || !listing.isFederationHidden())
                .map(this::toFederatedDto)
                .collect(Collectors.toList()));
    }

    public FederatedBusinessListingDTO hideFromFederation(Long listingId, String reason) {
        requireModeratePermission();
        BusinessListing listing = authorizationService.withoutOrganizationFilter(
                () -> getListingForModeration(listingId));
        listing.setFederationHidden(true);
        listing.setFederationHiddenAt(LocalDateTime.now());
        listing.setFederationHiddenByUserId(currentUserId());
        listing.setFederationHiddenReason(reason);
        businessListingRepository.save(listing);
        return authorizationService.withoutOrganizationFilter(() -> toFederatedDto(listing));
    }

    public FederatedBusinessListingDTO unhideFromFederation(Long listingId) {
        requireModeratePermission();
        BusinessListing listing = authorizationService.withoutOrganizationFilter(
                () -> getListingForModeration(listingId));
        listing.setFederationHidden(false);
        listing.setFederationHiddenAt(null);
        listing.setFederationHiddenByUserId(null);
        listing.setFederationHiddenReason(null);
        businessListingRepository.save(listing);
        return authorizationService.withoutOrganizationFilter(() -> toFederatedDto(listing));
    }

    public String uploadMyLogo(Long businessId, MultipartFile file) {
        requireRegisterOwnPermission();
        return uploadLogoForBusiness(getOwnBusiness(businessId), file);
    }

    public String uploadAdminLogo(Long businessId, MultipartFile file) {
        requireManagePermission();
        Business business = getBusinessForCurrentOrg(businessId);
        assertAdminMayEditContent(business);
        return uploadLogoForBusiness(business, file);
    }

    public void deleteMyLogo(Long businessId) {
        requireRegisterOwnPermission();
        deleteLogoForBusiness(getOwnBusiness(businessId));
    }

    public void deleteAdminLogo(Long businessId) {
        requireManagePermission();
        Business business = getBusinessForCurrentOrg(businessId);
        assertAdminMayEditContent(business);
        deleteLogoForBusiness(business);
    }

    public StoredImage getLogo(Long businessId) {
        requireViewPermission();
        Long orgId = requireOrganizationId();
        return authorizationService.withoutOrganizationFilter(() -> {
            Business business = businessRepository.findById(businessId)
                    .orElseThrow(() -> new IllegalArgumentException("Business not found: " + businessId));
            assertCanViewLogo(business, orgId);
            return loadStoredImage(business);
        });
    }

    public StoredImage getPublicLogo(String orgHandle, Long businessId) {
        Organization organization = organizationRepository.findByHandle(orgHandle.trim())
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + orgHandle));
        if (!isPublicDirectoryAvailable(organization.getId())) {
            throw new AccessDeniedException("Public directory is not enabled.");
        }
        return authorizationService.withoutOrganizationFilter(() -> {
            Business business = businessRepository.findById(businessId)
                    .orElseThrow(() -> new IllegalArgumentException("Business not found: " + businessId));
            if (!organization.getId().equals(business.getOrganizationId())) {
                throw new AccessDeniedException("Business does not belong to this organization.");
            }
            BusinessListing listing = businessListingRepository.findByBusinessId(businessId)
                    .orElseThrow(() -> new IllegalArgumentException("Listing not found"));
            if (!BusinessListing.Status.PUBLISHED.name().equals(listing.getStatus())) {
                throw new AccessDeniedException("Business is not publicly visible.");
            }
            return loadStoredImage(business);
        });
    }

    public record StoredImage(byte[] bytes, String contentType) {
    }

    private String uploadLogoForBusiness(Business business, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        String contentType = file.getContentType();
        List<String> allowed = storageProperties.getProfileImage().getAllowedTypes();
        if (contentType == null || !allowed.contains(contentType)) {
            throw new IllegalArgumentException("File type not allowed. Accepted: " + String.join(", ", allowed));
        }
        long maxBytes = storageProperties.getProfileImage().getMaxSizeMb() * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException(
                    "File exceeds maximum size of " + storageProperties.getProfileImage().getMaxSizeMb() + " MB");
        }

        try {
            if (business.getLogoImageKey() != null) {
                try {
                    storageService.delete(business.getLogoImageKey());
                } catch (Exception e) {
                    log.warn("Failed to delete old logo for business {}: {}", business.getId(), e.getMessage());
                }
            }
            String extension = logoExtension(file.getOriginalFilename(), contentType);
            String key = "business-logos/" + business.getOrganizationId() + "/" + business.getId()
                    + "/" + UUID.randomUUID() + extension;
            storageService.upload(key, file.getInputStream(), contentType, file.getSize());
            business.setLogoImageKey(key);
            businessRepository.save(business);
            return "/api/business-directory/" + business.getId() + "/logo";
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Logo upload failed: " + e.getMessage(), e);
        }
    }

    private void deleteLogoForBusiness(Business business) {
        if (business.getLogoImageKey() == null) {
            return;
        }
        try {
            storageService.delete(business.getLogoImageKey());
        } catch (Exception e) {
            log.warn("Failed to delete logo object for business {}: {}", business.getId(), e.getMessage());
        }
        business.setLogoImageKey(null);
        businessRepository.save(business);
    }

    private StoredImage loadStoredImage(Business business) {
        if (business.getLogoImageKey() == null || business.getLogoImageKey().isBlank()) {
            return null;
        }
        try {
            ResponseInputStream<GetObjectResponse> response = storageService.download(business.getLogoImageKey());
            GetObjectResponse metadata = response.response();
            return new StoredImage(response.readAllBytes(), metadata.contentType());
        } catch (Exception e) {
            log.error("Failed to serve logo for business {}: {}", business.getId(), e.getMessage());
            return null;
        }
    }

    private void assertCanViewLogo(Business business, Long viewerOrgId) {
        if (viewerOrgId.equals(business.getOrganizationId())) {
            return;
        }
        BusinessListing listing = businessListingRepository.findByBusinessId(business.getId()).orElse(null);
        if (listing == null
                || !BusinessListing.Status.PUBLISHED.name().equals(listing.getStatus())) {
            throw new AccessDeniedException("You cannot view this business logo.");
        }
        boolean isParent = partnershipRepository
                .findByParentOrganizationIdAndStatus(viewerOrgId, OrganizationPartnership.Status.ACTIVE.name())
                .stream()
                .anyMatch(p -> p.getMemberOrganizationId().equals(business.getOrganizationId()));
        if (isParent) {
            return;
        }
        var memberPartnership = partnershipRepository.findFirstByMemberOrganizationIdAndStatus(
                viewerOrgId, OrganizationPartnership.Status.ACTIVE.name());
        if (memberPartnership.isEmpty() || listing.isFederationHidden()) {
            throw new AccessDeniedException("You cannot view this business logo.");
        }
        Long parentOrgId = memberPartnership.get().getParentOrganizationId();
        boolean siblingShare = partnershipRepository
                .findByParentOrganizationIdAndStatus(parentOrgId, OrganizationPartnership.Status.ACTIVE.name())
                .stream()
                .anyMatch(p -> p.getMemberOrganizationId().equals(business.getOrganizationId()));
        if (!siblingShare) {
            throw new AccessDeniedException("You cannot view this business logo.");
        }
    }

    private static String logoExtension(String originalFilename, String contentType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf('.'));
        }
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }

    private BusinessDTO createBusinessInternal(BusinessDTO dto, Long ownerPersonId, boolean memberOwned) {
        Long orgId = requireOrganizationId();
        assertListingLimitAllowsCreate(orgId);
        Business business = new Business();
        business.setOrganizationId(orgId);
        applyBusinessFields(business, dto);
        business.setOwnerPersonId(ownerPersonId);
        validateOwnerPerson(business.getOwnerPersonId(), orgId);
        business = businessRepository.save(business);

        BusinessListing listing = new BusinessListing();
        listing.setOrganizationId(orgId);
        listing.setBusinessId(business.getId());
        listing.setStatus(BusinessListing.Status.DRAFT.name());
        listing.setVisibility(BusinessListing.Visibility.LOCAL_ONLY.name());
        businessListingRepository.save(listing);

        log.info("Business created: id={} org={} memberOwned={}", business.getId(), orgId, memberOwned);
        return toBusinessDto(business);
    }

    /** Count all businesses for the org (draft/published/suspended); partner listings do not count. */
    private void assertListingLimitAllowsCreate(Long organizationId) {
        try {
            Integer listingLimit = organizationSubscriptionService.getFeatureLimit(
                    organizationId, FeatureKeys.BUSINESS_DIRECTORY);
            if (listingLimit != null) {
                long currentCount = businessRepository.countByOrganizationId(organizationId);
                if (currentCount >= listingLimit) {
                    throw new PlanLimitExceededException(
                            FeatureKeys.BUSINESS_DIRECTORY, listingLimit, (int) currentCount);
                }
            }
        } catch (PlanLimitExceededException e) {
            throw e;
        } catch (RuntimeException e) {
            // No active subscription — PlanFeatureAspect already blocks when enabled=false;
            // if we reach here without a limit row, allow create.
            log.debug("Listing limit check skipped for org {}: {}", organizationId, e.getMessage());
        }
    }

    private BusinessListingDTO updateListingInternal(Business business, BusinessListingDTO dto, boolean adminDirectPublish) {
        BusinessListing listing = getListingForBusiness(business.getId());
        if (dto.getStatus() != null) {
            validateListingStatus(dto.getStatus());
            if (adminDirectPublish
                    && BusinessListing.Status.PUBLISHED.name().equals(dto.getStatus())) {
                listing.setStatus(BusinessListing.Status.PUBLISHED.name());
                listing.setVisibility(BusinessListing.Visibility.SHARED_WITH_FEDERATION.name());
                listing.setPublicVisible(true);
                listing.setPublishedAt(LocalDateTime.now());
                listing.setReviewedAt(LocalDateTime.now());
                listing.setReviewedByUserId(currentUserId());
            } else if (BusinessListing.Status.DRAFT.name().equals(dto.getStatus())) {
                listing.setStatus(BusinessListing.Status.DRAFT.name());
                listing.setVisibility(BusinessListing.Visibility.LOCAL_ONLY.name());
                listing.setPublicVisible(false);
            }
        }
        // Ignore legacy per-listing visibility/publicVisible from clients.
        return toListingDto(businessListingRepository.save(listing));
    }

    private void deleteBusinessInternal(Business business) {
        if (business.getLogoImageKey() != null) {
            try {
                storageService.delete(business.getLogoImageKey());
            } catch (Exception e) {
                log.warn("Failed to delete logo for business {}: {}", business.getId(), e.getMessage());
            }
        }
        businessListingRepository.findByBusinessId(business.getId())
                .ifPresent(businessListingRepository::delete);
        businessRepository.delete(business);
    }

    private BusinessListing getListingForModeration(Long listingId) {
        Long orgId = requireOrganizationId();
        BusinessListing listing = businessListingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found: " + listingId));
        if (!businessListingRepository.existsActivePartnership(orgId, listing.getOrganizationId())) {
            throw new AccessDeniedException("You can only moderate listings from member organizations.");
        }
        return listing;
    }

    private Business getOwnBusiness(Long id) {
        Business business = getBusinessForCurrentOrg(id);
        Long personId = requireLinkedPersonId();
        if (!personId.equals(business.getOwnerPersonId())) {
            throw new AccessDeniedException("You can only manage your own businesses.");
        }
        return business;
    }

    private BusinessListing getListingForBusiness(Long businessId) {
        return businessListingRepository.findByBusinessId(businessId)
                .orElseThrow(() -> new IllegalStateException("Listing not found for business: " + businessId));
    }

    private Long requireLinkedPersonId() {
        User user = authorizationService.getCurrentUser();
        if (user == null) {
            throw new AccessDeniedException("Authentication required.");
        }
        UserMemberLink link = userMemberLinkRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalStateException(
                        "Your account is not linked to a member profile. Contact your organization admin."));
        return link.getPerson().getId();
    }

    private void notifyOwnerListingDecision(Business business, boolean approved, String reason) {
        if (business.getOwnerPersonId() == null) {
            return;
        }
        personRepository.findById(business.getOwnerPersonId()).ifPresent(person -> {
            UserMemberLink link = userMemberLinkRepository.findByPersonId(person.getId()).orElse(null);
            User ownerUser = link != null ? link.getUser() : null;
            String email = ownerUser != null ? ownerUser.getEmail() : person.getEmail();
            String name = person.getFirstName();
            Organization org = organizationRepository.findById(business.getOrganizationId()).orElse(null);
            String orgName = org != null ? org.getName() : "your organization";
            Long ownerUserId = ownerUser != null ? ownerUser.getId() : null;
            Long orgId = business.getOrganizationId();
            if (approved) {
                federationNotificationService.notifyBusinessApproved(
                        ownerUserId, orgId, email, name, business.getName(), orgName);
            } else {
                federationNotificationService.notifyBusinessRejected(
                        ownerUserId, orgId, email, name, business.getName(), orgName, reason);
            }
        });
    }

    private void notifyOwnerListingSuspended(Business business, String reason) {
        if (business.getOwnerPersonId() == null) {
            return;
        }
        personRepository.findById(business.getOwnerPersonId()).ifPresent(person -> {
            UserMemberLink link = userMemberLinkRepository.findByPersonId(person.getId()).orElse(null);
            User ownerUser = link != null ? link.getUser() : null;
            String email = ownerUser != null ? ownerUser.getEmail() : person.getEmail();
            String name = person.getFirstName();
            Organization org = organizationRepository.findById(business.getOrganizationId()).orElse(null);
            String orgName = org != null ? org.getName() : "your organization";
            Long ownerUserId = ownerUser != null ? ownerUser.getId() : null;
            federationNotificationService.notifyBusinessSuspended(
                    ownerUserId,
                    business.getOrganizationId(),
                    email,
                    name,
                    business.getName(),
                    orgName,
                    reason);
        });
    }

    private static boolean isMemberOwned(Business business) {
        return business.getOwnerPersonId() != null;
    }

    private void assertAdminMayEditContent(Business business) {
        if (isMemberOwned(business)) {
            throw new AccessDeniedException(
                    "Admins cannot edit or delete member-owned listings. Suspend the listing with a reason instead.");
        }
    }

    private void clearSuspension(BusinessListing listing) {
        listing.setSuspensionReason(null);
        listing.setSuspendedAt(null);
        listing.setSuspendedByUserId(null);
    }

    private static String requireNonBlankReason(String reason, String message) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return reason.trim();
    }

    private FederatedBusinessListingDTO toFederatedDto(BusinessListing listing) {
        Business business = businessRepository.findById(listing.getBusinessId())
                .orElseThrow(() -> new IllegalStateException("Business missing for listing: " + listing.getId()));
        Organization org = organizationRepository.findById(listing.getOrganizationId())
                .orElseThrow(() -> new IllegalStateException("Organization missing for listing: " + listing.getId()));

        FederatedBusinessListingDTO dto = new FederatedBusinessListingDTO();
        copyBusinessFields(dto, business);
        dto.setListing(toListingDto(listing));
        dto.setListingId(listing.getId());
        dto.setListedByOrganizationName(org.getName());
        dto.setListedByOrganizationHandle(org.getHandle());
        dto.setPublishedAt(listing.getPublishedAt());
        return dto;
    }

    private BusinessDTO toBusinessDto(Business business) {
        BusinessDTO dto = new BusinessDTO();
        copyBusinessFields(dto, business);
        businessListingRepository.findByBusinessId(business.getId())
                .ifPresent(listing -> dto.setListing(toListingDto(listing)));
        return dto;
    }

    private void copyBusinessFields(BusinessDTO dto, Business business) {
        dto.setId(business.getId());
        dto.setOrganizationId(business.getOrganizationId());
        dto.setOwnerPersonId(business.getOwnerPersonId());
        dto.setName(business.getName());
        dto.setCategory(business.getCategory());
        dto.setDescription(business.getDescription());
        dto.setEmail(business.getEmail());
        dto.setPhone(business.getPhone());
        dto.setWebsite(business.getWebsite());
        dto.setFacebookUrl(business.getFacebookUrl());
        dto.setInstagramUrl(business.getInstagramUrl());
        dto.setTiktokUrl(business.getTiktokUrl());
        dto.setYoutubeUrl(business.getYoutubeUrl());
        dto.setLinkedinUrl(business.getLinkedinUrl());
        dto.setWhatsappUrl(business.getWhatsappUrl());
        dto.setAddress(business.getAddress());
        dto.setCity(business.getCity());
        dto.setCountry(business.getCountry());
        dto.setCreatedAt(business.getCreatedAt());
        dto.setUpdatedAt(business.getUpdatedAt());
        if (business.getLogoImageKey() != null && !business.getLogoImageKey().isBlank()) {
            dto.setLogoUrl("/api/business-directory/" + business.getId() + "/logo");
        }

        if (business.getOwnerPersonId() != null) {
            personRepository.findById(business.getOwnerPersonId())
                    .ifPresent(person -> dto.setOwnerPersonName(formatPersonName(person)));
        }
    }

    private BusinessListingDTO toListingDto(BusinessListing listing) {
        BusinessListingDTO dto = new BusinessListingDTO();
        dto.setId(listing.getId());
        dto.setOrganizationId(listing.getOrganizationId());
        dto.setBusinessId(listing.getBusinessId());
        dto.setStatus(listing.getStatus());
        dto.setVisibility(listing.getVisibility());
        dto.setPublishedAt(listing.getPublishedAt());
        dto.setSubmittedAt(listing.getSubmittedAt());
        dto.setReviewedAt(listing.getReviewedAt());
        dto.setRejectionReason(listing.getRejectionReason());
        dto.setFederationHidden(listing.isFederationHidden());
        dto.setFederationHiddenReason(listing.getFederationHiddenReason());
        dto.setPublicVisible(listing.isPublicVisible());
        dto.setSuspensionReason(listing.getSuspensionReason());
        dto.setSuspendedAt(listing.getSuspendedAt());
        return dto;
    }

    private PublicBusinessDTO toPublicBusinessDtoFromListing(BusinessListing listing) {
        Business business = businessRepository.findById(listing.getBusinessId())
                .orElseThrow(() -> new IllegalStateException("Business missing for listing: " + listing.getId()));
        Organization org = organizationRepository.findById(listing.getOrganizationId())
                .orElseThrow(() -> new IllegalStateException("Organization missing for listing: " + listing.getId()));
        PublicBusinessDTO dto = toPublicBusinessDto(business, org.getHandle());
        dto.setListedByOrganizationName(org.getName());
        dto.setListedByOrganizationHandle(org.getHandle());
        return dto;
    }

    private PublicBusinessDTO toPublicBusinessDto(Business business, String orgHandle) {
        PublicBusinessDTO dto = new PublicBusinessDTO();
        dto.setId(business.getId());
        dto.setName(business.getName());
        dto.setCategory(business.getCategory());
        dto.setDescription(business.getDescription());
        dto.setEmail(business.getEmail());
        dto.setPhone(business.getPhone());
        dto.setWebsite(business.getWebsite());
        dto.setFacebookUrl(business.getFacebookUrl());
        dto.setInstagramUrl(business.getInstagramUrl());
        dto.setTiktokUrl(business.getTiktokUrl());
        dto.setYoutubeUrl(business.getYoutubeUrl());
        dto.setLinkedinUrl(business.getLinkedinUrl());
        dto.setWhatsappUrl(business.getWhatsappUrl());
        dto.setCity(business.getCity());
        dto.setCountry(business.getCountry());
        if (business.getLogoImageKey() != null && !business.getLogoImageKey().isBlank()) {
            dto.setLogoUrl("/api/business-directory/public/" + orgHandle + "/" + business.getId() + "/logo");
        }
        return dto;
    }

    private void applyBusinessFields(Business business, BusinessDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new IllegalArgumentException("Business name is required.");
        }
        business.setName(dto.getName().trim());
        String category = trimOrNull(dto.getCategory());
        if (category != null && !businessCategoryService.isActiveCode(category)) {
            throw new IllegalArgumentException("Unknown or inactive business category: " + category);
        }
        business.setCategory(category);
        business.setDescription(trimOrNull(dto.getDescription()));
        business.setEmail(trimOrNull(dto.getEmail()));
        business.setPhone(trimOrNull(dto.getPhone()));
        business.setWebsite(normalizeUrl(dto.getWebsite()));
        business.setFacebookUrl(normalizeUrl(dto.getFacebookUrl()));
        business.setInstagramUrl(normalizeUrl(dto.getInstagramUrl()));
        business.setTiktokUrl(normalizeUrl(dto.getTiktokUrl()));
        business.setYoutubeUrl(normalizeUrl(dto.getYoutubeUrl()));
        business.setLinkedinUrl(normalizeUrl(dto.getLinkedinUrl()));
        business.setWhatsappUrl(normalizeUrl(dto.getWhatsappUrl()));
        business.setAddress(trimOrNull(dto.getAddress()));
        business.setCity(trimOrNull(dto.getCity()));
        business.setCountry(trimOrNull(dto.getCountry()));
        if (dto.getOwnerPersonId() != null) {
            business.setOwnerPersonId(dto.getOwnerPersonId());
        }
    }

    private void validateOwnerPerson(Long personId, Long orgId) {
        if (personId == null) {
            return;
        }
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new IllegalArgumentException("Owner person not found: " + personId));
        if (!orgId.equals(person.getOrganizationId())) {
            throw new IllegalArgumentException("Owner person must belong to this organization.");
        }
    }

    private Business getBusinessForCurrentOrg(Long id) {
        Long orgId = requireOrganizationId();
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Business not found: " + id));
        if (!orgId.equals(business.getOrganizationId())) {
            throw new AccessDeniedException("Business not found in current organization context.");
        }
        return business;
    }

    private String formatPersonName(Person person) {
        return person.getFirstName() + " " + person.getLastName();
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Trim and ensure http(s) scheme for external profile/website links. */
    private String normalizeUrl(String value) {
        String trimmed = trimOrNull(value);
        if (trimmed == null) {
            return null;
        }
        String lower = trimmed.toLowerCase();
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            return trimmed;
        }
        return "https://" + trimmed;
    }

    private void validateListingStatus(String status) {
        try {
            BusinessListing.Status.valueOf(status);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid listing status: " + status);
        }
    }

    private Long currentUserId() {
        User user = authorizationService.getCurrentUser();
        return user != null ? user.getId() : null;
    }

    /**
     * Public site: tenant setting on and host org's plan includes business.directory.
     * Missing subscription → treat as unavailable (do not throw to anonymous callers).
     */
    private boolean isPublicDirectoryAvailable(Long organizationId) {
        if (!tenantSettingService.isPublicDirectoryEnabled(organizationId)) {
            return false;
        }
        try {
            return organizationSubscriptionService.isFeatureEnabled(
                    organizationId, FeatureKeys.BUSINESS_DIRECTORY);
        } catch (RuntimeException ex) {
            log.debug("Public directory plan check failed for org {}: {}", organizationId, ex.getMessage());
            return false;
        }
    }

    private Long requireOrganizationId() {
        Long orgId = TenantContext.getCurrentOrganizationId();
        if (orgId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Organization context is required for this operation.");
        }
        return orgId;
    }

    private static int clampPageSize(int size) {
        if (size < 1) {
            return 12;
        }
        return Math.min(size, 48);
    }

    private static String normalizeFilter(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void requireViewPermission() {
        if (!authorizationService.hasPermission("business_directory.view")) {
            throw new AccessDeniedException("Insufficient permissions to view business directory.");
        }
    }

    private void requireViewOrRegisterPermission() {
        if (!authorizationService.hasPermission("business_directory.view")
                && !authorizationService.hasPermission("business_directory.register_own")
                && !authorizationService.hasPermission("business_directory.manage")
                && !authorizationService.hasPermission("business_directory.approve")
                && !authorizationService.hasPermission("business_directory.moderate")) {
            throw new AccessDeniedException("Insufficient permissions to view business directory usage.");
        }
    }

    private void requireManagePermission() {
        if (!authorizationService.hasPermission("business_directory.manage")) {
            throw new AccessDeniedException("Insufficient permissions to manage business directory.");
        }
    }

    private void requireRegisterOwnPermission() {
        if (!authorizationService.hasPermission("business_directory.register_own")) {
            throw new AccessDeniedException("Insufficient permissions to register your business.");
        }
    }

    private void requireApprovePermission() {
        if (!authorizationService.hasPermission("business_directory.approve")) {
            throw new AccessDeniedException("Insufficient permissions to approve business listings.");
        }
    }

    private void requireApproveOrManagePermission() {
        if (!authorizationService.hasPermission("business_directory.approve")
                && !authorizationService.hasPermission("business_directory.manage")) {
            throw new AccessDeniedException("Insufficient permissions to suspend business listings.");
        }
    }

    private void requireModeratePermission() {
        if (!authorizationService.hasPermission("business_directory.moderate")) {
            throw new AccessDeniedException("Insufficient permissions to moderate federation listings.");
        }
    }
}

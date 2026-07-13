package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.FederationInviteCodeDTO;
import com.mosque.crm.dto.OrganizationDiscoveryDTO;
import com.mosque.crm.dto.OrganizationPartnershipDTO;
import com.mosque.crm.dto.OrganizationShareSettingDTO;
import com.mosque.crm.dto.PartnershipOrgHandleRequestDTO;
import com.mosque.crm.dto.UpdateShareSettingDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.OrganizationPartnership;
import com.mosque.crm.entity.OrganizationShareSetting;
import com.mosque.crm.entity.User;
import com.mosque.crm.federation.FederationConstants;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.OrganizationPartnershipRepository;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.OrganizationShareSettingRepository;

@Service
@Transactional
public class OrganizationPartnershipService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationPartnershipService.class);

    private final OrganizationPartnershipRepository partnershipRepository;
    private final OrganizationShareSettingRepository shareSettingRepository;
    private final OrganizationRepository organizationRepository;
    private final AuthorizationService authorizationService;
    private final FederationNotificationService federationNotificationService;

    public OrganizationPartnershipService(
            OrganizationPartnershipRepository partnershipRepository,
            OrganizationShareSettingRepository shareSettingRepository,
            OrganizationRepository organizationRepository,
            AuthorizationService authorizationService,
            FederationNotificationService federationNotificationService) {
        this.partnershipRepository = partnershipRepository;
        this.shareSettingRepository = shareSettingRepository;
        this.organizationRepository = organizationRepository;
        this.authorizationService = authorizationService;
        this.federationNotificationService = federationNotificationService;
    }

    public List<OrganizationPartnershipDTO> listForCurrentOrganization() {
        requireViewPermission();
        Long orgId = requireOrganizationId();

        return partnershipRepository.findByParentOrganizationIdOrMemberOrganizationId(orgId, orgId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public OrganizationPartnershipDTO getById(Long id) {
        requireViewPermission();
        OrganizationPartnership partnership = getPartnershipForCurrentOrg(id);
        return toDto(partnership);
    }

    public List<OrganizationDiscoveryDTO> discoverOrganizations(String query) {
        requireViewPermission();
        Long orgId = requireOrganizationId();
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        String trimmed = query.trim();
        if (trimmed.toUpperCase().startsWith("FED-") && trimmed.length() >= 6) {
            Optional<Organization> byCode = organizationRepository
                    .findByFederationInviteCodeIgnoreCase(trimmed);
            if (byCode.isPresent() && byCode.get().isActive() && !byCode.get().getId().equals(orgId)) {
                return List.of(toDiscoveryDto(byCode.get()));
            }
        }
        if (!trimmed.contains(" ")) {
            Optional<Organization> byHandle = organizationRepository.findByHandle(trimmed);
            if (byHandle.isPresent() && byHandle.get().isActive() && !byHandle.get().getId().equals(orgId)) {
                return List.of(toDiscoveryDto(byHandle.get()));
            }
        }
        return organizationRepository.searchActiveOrganizations(trimmed, orgId)
                .stream()
                .map(this::toDiscoveryDto)
                .collect(Collectors.toList());
    }

    public FederationInviteCodeDTO getInviteCode() {
        requireManagePermission();
        Organization org = getCurrentOrganizationEntity();
        if (org.getFederationInviteCode() == null || org.getFederationInviteCode().isBlank()) {
            org.setFederationInviteCode(generateUniqueInviteCode());
            org = organizationRepository.save(org);
        }
        FederationInviteCodeDTO dto = new FederationInviteCodeDTO();
        dto.setInviteCode(org.getFederationInviteCode());
        return dto;
    }

    public FederationInviteCodeDTO regenerateInviteCode() {
        requireManagePermission();
        Organization org = getCurrentOrganizationEntity();
        org.setFederationInviteCode(generateUniqueInviteCode());
        org = organizationRepository.save(org);
        FederationInviteCodeDTO dto = new FederationInviteCodeDTO();
        dto.setInviteCode(org.getFederationInviteCode());
        return dto;
    }

    public OrganizationPartnershipDTO invite(PartnershipOrgHandleRequestDTO request) {
        requireManagePermission();
        Long parentOrgId = requireOrganizationId();
        Organization memberOrg = resolveTargetOrganization(request);

        OrganizationPartnership partnership = findOrCreatePendingPartnership(
                parentOrgId,
                memberOrg.getId(),
                OrganizationPartnership.Status.PENDING_INVITE,
                OrganizationPartnership.InitiatedBy.PARENT,
                request.getMessage());

        log.info("Partnership invite created: parent={} member={}", parentOrgId, memberOrg.getId());
        try {
            federationNotificationService.notifyPartnershipInvite(partnership);
        } catch (Exception e) {
            log.warn("Failed to send partnership invite notification: {}", e.getMessage());
        }
        return toDto(partnership);
    }

    public OrganizationPartnershipDTO requestToJoin(PartnershipOrgHandleRequestDTO request) {
        requireManagePermission();
        Long memberOrgId = requireOrganizationId();
        Organization parentOrg = resolveTargetOrganization(request);

        if (parentOrg.getId().equals(memberOrgId)) {
            throw new IllegalArgumentException("An organization cannot partner with itself.");
        }

        OrganizationPartnership partnership = findOrCreatePendingPartnership(
                parentOrg.getId(),
                memberOrgId,
                OrganizationPartnership.Status.PENDING_REQUEST,
                OrganizationPartnership.InitiatedBy.MEMBER,
                request.getMessage());

        log.info("Partnership request created: parent={} member={}", parentOrg.getId(), memberOrgId);
        try {
            federationNotificationService.notifyPartnershipRequest(partnership);
        } catch (Exception e) {
            log.warn("Failed to send partnership request notification: {}", e.getMessage());
        }
        return toDto(partnership);
    }

    public OrganizationPartnershipDTO acceptInvite(Long id) {
        requireManagePermission();
        Long memberOrgId = requireOrganizationId();
        OrganizationPartnership partnership = getByIdOrThrow(id);

        if (!memberOrgId.equals(partnership.getMemberOrganizationId())) {
            throw new AccessDeniedException("Only the invited organization can accept this invitation.");
        }
        if (!OrganizationPartnership.Status.PENDING_INVITE.name().equals(partnership.getStatus())) {
            throw new IllegalStateException("This invitation is no longer pending.");
        }

        return activatePartnership(partnership);
    }

    /**
     * Re-send bell + email alerts for a pending invite/request.
     * Useful when the original cross-org notification failed under tenant filtering.
     */
    public OrganizationPartnershipDTO resendNotification(Long id) {
        requireManagePermission();
        OrganizationPartnership partnership = getPartnershipForCurrentOrg(id);
        String status = partnership.getStatus();
        try {
            if (OrganizationPartnership.Status.PENDING_INVITE.name().equals(status)) {
                federationNotificationService.notifyPartnershipInvite(partnership);
            } else if (OrganizationPartnership.Status.PENDING_REQUEST.name().equals(status)) {
                federationNotificationService.notifyPartnershipRequest(partnership);
            } else {
                throw new IllegalStateException("Notifications can only be resent for pending partnerships.");
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to resend partnership notification: {}", e.getMessage());
            throw new IllegalStateException("Failed to resend partnership notification.");
        }
        return toDto(partnership);
    }

    public OrganizationPartnershipDTO approveRequest(Long id) {
        requireManagePermission();
        Long parentOrgId = requireOrganizationId();
        OrganizationPartnership partnership = getByIdOrThrow(id);

        if (!parentOrgId.equals(partnership.getParentOrganizationId())) {
            throw new AccessDeniedException("Only the parent organization can approve this request.");
        }
        if (!OrganizationPartnership.Status.PENDING_REQUEST.name().equals(partnership.getStatus())) {
            throw new IllegalStateException("This request is no longer pending.");
        }

        return activatePartnership(partnership);
    }

    public OrganizationPartnershipDTO reject(Long id, String reason) {
        requireManagePermission();
        OrganizationPartnership partnership = getPartnershipForCurrentOrg(id);
        String status = partnership.getStatus();
        if (!OrganizationPartnership.Status.PENDING_INVITE.name().equals(status)
                && !OrganizationPartnership.Status.PENDING_REQUEST.name().equals(status)) {
            throw new IllegalStateException("Only pending partnerships can be rejected.");
        }

        validatePendingActionRole(partnership, status);

        try {
            federationNotificationService.notifyPartnershipRejected(partnership, reason);
        } catch (Exception e) {
            log.warn("Failed to send partnership rejected notification: {}", e.getMessage());
        }

        partnership.setStatus(OrganizationPartnership.Status.ENDED.name());
        partnership.setEndedReason(reason != null ? reason : "Rejected");
        partnership.setEndedAt(LocalDateTime.now());
        partnership.setEndedByUserId(currentUserId());
        return toDto(partnershipRepository.save(partnership));
    }

    public OrganizationPartnershipDTO suspend(Long id, String reason) {
        requireManagePermission();
        OrganizationPartnership partnership = getPartnershipForCurrentOrg(id);
        if (!OrganizationPartnership.Status.ACTIVE.name().equals(partnership.getStatus())) {
            throw new IllegalStateException("Only active partnerships can be suspended.");
        }

        Long actorOrgId = requireOrganizationId();
        partnership.setStatus(OrganizationPartnership.Status.SUSPENDED.name());
        partnership.setEndedReason(reason);
        OrganizationPartnershipDTO dto = toDto(partnershipRepository.save(partnership));
        try {
            federationNotificationService.notifyPartnershipSuspended(partnership, actorOrgId, reason);
        } catch (Exception e) {
            log.warn("Failed to send partnership suspended notification: {}", e.getMessage());
        }
        return dto;
    }

    public OrganizationPartnershipDTO reactivate(Long id) {
        requireManagePermission();
        OrganizationPartnership partnership = getPartnershipForCurrentOrg(id);
        if (!OrganizationPartnership.Status.SUSPENDED.name().equals(partnership.getStatus())) {
            throw new IllegalStateException("Only suspended partnerships can be reactivated.");
        }

        Long actorOrgId = requireOrganizationId();
        partnership.setStatus(OrganizationPartnership.Status.ACTIVE.name());
        partnership.setEndedReason(null);
        OrganizationPartnershipDTO dto = toDto(partnershipRepository.save(partnership));
        try {
            federationNotificationService.notifyPartnershipReactivated(partnership, actorOrgId);
        } catch (Exception e) {
            log.warn("Failed to send partnership reactivated notification: {}", e.getMessage());
        }
        return dto;
    }

    public OrganizationPartnershipDTO end(Long id, String reason) {
        requireManagePermission();
        OrganizationPartnership partnership = getPartnershipForCurrentOrg(id);
        if (OrganizationPartnership.Status.ENDED.name().equals(partnership.getStatus())) {
            throw new IllegalStateException("Partnership is already ended.");
        }

        Long actorOrgId = requireOrganizationId();
        partnership.setStatus(OrganizationPartnership.Status.ENDED.name());
        partnership.setEndedReason(reason != null ? reason : "Ended by organization");
        partnership.setEndedAt(LocalDateTime.now());
        partnership.setEndedByUserId(currentUserId());
        OrganizationPartnershipDTO dto = toDto(partnershipRepository.save(partnership));
        try {
            federationNotificationService.notifyPartnershipEnded(partnership, actorOrgId, reason);
        } catch (Exception e) {
            log.warn("Failed to send partnership ended notification: {}", e.getMessage());
        }
        return dto;
    }

    public List<OrganizationShareSettingDTO> getShareSettings(Long partnershipId) {
        requireViewPermission();
        OrganizationPartnership partnership = getPartnershipForCurrentOrg(partnershipId);
        ensureDefaultShareSettings(partnership);
        return shareSettingRepository.findByPartnershipId(partnership.getId())
                .stream()
                .map(this::toShareSettingDto)
                .collect(Collectors.toList());
    }

    public OrganizationShareSettingDTO updateShareSetting(
            Long partnershipId, String moduleKey, UpdateShareSettingDTO dto) {
        requireManagePermission();
        OrganizationPartnership partnership = getPartnershipForCurrentOrg(partnershipId);
        Long memberOrgId = requireOrganizationId();

        if (!memberOrgId.equals(partnership.getMemberOrganizationId())) {
            throw new AccessDeniedException("Only the member organization can update sharing settings.");
        }
        if (!OrganizationPartnership.Status.ACTIVE.name().equals(partnership.getStatus())) {
            throw new IllegalStateException("Sharing settings can only be updated for active partnerships.");
        }

        ensureDefaultShareSettings(partnership);
        OrganizationShareSetting setting = shareSettingRepository
                .findByPartnershipIdAndModuleKey(partnershipId, moduleKey)
                .orElseThrow(() -> new IllegalArgumentException("Unknown share module: " + moduleKey));

        setting.setEnabled(dto.isEnabled());
        if (dto.getShareLevel() != null && !dto.getShareLevel().isBlank()) {
            validateShareLevel(dto.getShareLevel());
            setting.setShareLevel(dto.getShareLevel());
        }
        setting.setUpdatedByUserId(currentUserId());
        return toShareSettingDto(shareSettingRepository.save(setting));
    }

    private OrganizationPartnershipDTO activatePartnership(OrganizationPartnership partnership) {
        if (partnershipRepository.existsByMemberOrganizationIdAndStatusIn(
                partnership.getMemberOrganizationId(),
                Set.of(OrganizationPartnership.Status.ACTIVE.name()))) {
            throw new IllegalStateException("This organization already has an active parent partnership.");
        }

        partnership.setStatus(OrganizationPartnership.Status.ACTIVE.name());
        partnership.setAcceptedAt(LocalDateTime.now());
        partnership = partnershipRepository.save(partnership);
        ensureDefaultShareSettings(partnership);
        try {
            federationNotificationService.notifyPartnershipActivated(partnership);
        } catch (Exception e) {
            log.warn("Failed to send partnership activated notification: {}", e.getMessage());
        }
        return toDto(partnership);
    }

    private void ensureDefaultShareSettings(OrganizationPartnership partnership) {
        for (String moduleKey : FederationConstants.SHAREABLE_MODULES) {
            if (shareSettingRepository.findByPartnershipIdAndModuleKey(partnership.getId(), moduleKey).isEmpty()) {
                OrganizationShareSetting setting = new OrganizationShareSetting();
                setting.setPartnershipId(partnership.getId());
                setting.setModuleKey(moduleKey);
                setting.setEnabled(false);
                setting.setShareLevel(OrganizationShareSetting.ShareLevel.PARENT_ONLY.name());
                shareSettingRepository.save(setting);
            }
        }
    }

    private OrganizationPartnership findOrCreatePendingPartnership(
            Long parentOrgId,
            Long memberOrgId,
            OrganizationPartnership.Status pendingStatus,
            OrganizationPartnership.InitiatedBy initiatedBy,
            String message) {
        if (parentOrgId.equals(memberOrgId)) {
            throw new IllegalArgumentException("An organization cannot partner with itself.");
        }

        if (partnershipRepository.existsByMemberOrganizationIdAndStatusIn(memberOrgId, Set.of(
                OrganizationPartnership.Status.PENDING_INVITE.name(),
                OrganizationPartnership.Status.PENDING_REQUEST.name(),
                OrganizationPartnership.Status.ACTIVE.name(),
                OrganizationPartnership.Status.SUSPENDED.name()))) {
            Optional<OrganizationPartnership> samePair = partnershipRepository
                    .findByParentOrganizationIdAndMemberOrganizationId(parentOrgId, memberOrgId);
            if (samePair.isEmpty() || !samePair.get().getMemberOrganizationId().equals(memberOrgId)) {
                throw new IllegalStateException("This organization already has a pending or active parent partnership.");
            }
            OrganizationPartnership existing = samePair.get();
            if (!OrganizationPartnership.Status.ENDED.name().equals(existing.getStatus())) {
                throw new IllegalStateException("A partnership already exists between these organizations.");
            }
        }

        OrganizationPartnership partnership = partnershipRepository
                .findByParentOrganizationIdAndMemberOrganizationId(parentOrgId, memberOrgId)
                .orElseGet(OrganizationPartnership::new);

        partnership.setParentOrganizationId(parentOrgId);
        partnership.setMemberOrganizationId(memberOrgId);
        partnership.setStatus(pendingStatus.name());
        partnership.setInitiatedBy(initiatedBy.name());
        partnership.setMessage(trimMessage(message));
        partnership.setEndedReason(null);
        partnership.setEndedAt(null);
        partnership.setEndedByUserId(null);
        partnership.setAcceptedAt(null);
        if (partnership.getInitiatedAt() == null) {
            partnership.setInitiatedAt(LocalDateTime.now());
        }
        return partnershipRepository.save(partnership);
    }

    private void validatePendingActionRole(OrganizationPartnership partnership, String status) {
        Long orgId = requireOrganizationId();
        if (OrganizationPartnership.Status.PENDING_INVITE.name().equals(status)) {
            if (!orgId.equals(partnership.getMemberOrganizationId())) {
                throw new AccessDeniedException("Only the invited organization can respond to this invitation.");
            }
        } else if (OrganizationPartnership.Status.PENDING_REQUEST.name().equals(status)) {
            if (!orgId.equals(partnership.getParentOrganizationId())) {
                throw new AccessDeniedException("Only the parent organization can respond to this request.");
            }
        }
    }

    private OrganizationPartnership getPartnershipForCurrentOrg(Long id) {
        OrganizationPartnership partnership = getByIdOrThrow(id);
        Long orgId = requireOrganizationId();
        if (!orgId.equals(partnership.getParentOrganizationId())
                && !orgId.equals(partnership.getMemberOrganizationId())) {
            throw new AccessDeniedException("Partnership not found in current organization context.");
        }
        return partnership;
    }

    private OrganizationPartnership getByIdOrThrow(Long id) {
        return partnershipRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Partnership not found: " + id));
    }

    private Organization resolveTargetOrganization(PartnershipOrgHandleRequestDTO request) {
        boolean hasCode = request.getInviteCode() != null && !request.getInviteCode().isBlank();
        boolean hasHandle = request.getOrgHandle() != null && !request.getOrgHandle().isBlank();
        if (!hasCode && !hasHandle) {
            throw new IllegalArgumentException("Organization handle or invite code is required.");
        }
        if (hasCode) {
            return organizationRepository.findByFederationInviteCodeIgnoreCase(request.getInviteCode().trim())
                    .filter(Organization::isActive)
                    .orElseThrow(() -> new IllegalArgumentException("No organization found for this invite code."));
        }
        return resolveTargetOrganizationByHandle(request.getOrgHandle());
    }

    private Organization resolveTargetOrganizationByHandle(String handle) {
        if (handle == null || handle.isBlank()) {
            throw new IllegalArgumentException("Organization handle or invite code is required.");
        }
        return organizationRepository.findByHandle(handle.trim())
                .filter(Organization::isActive)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + handle));
    }

    private Organization getCurrentOrganizationEntity() {
        Long orgId = requireOrganizationId();
        return organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalStateException("Organization not found: " + orgId));
    }

    private String generateUniqueInviteCode() {
        String code;
        do {
            code = "FED-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        } while (organizationRepository.existsByFederationInviteCode(code));
        return code;
    }

    private void validateShareLevel(String shareLevel) {
        try {
            OrganizationShareSetting.ShareLevel.valueOf(shareLevel);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid share level: " + shareLevel);
        }
    }

    private OrganizationPartnershipDTO toDto(OrganizationPartnership partnership) {
        OrganizationPartnershipDTO dto = new OrganizationPartnershipDTO();
        dto.setId(partnership.getId());
        dto.setParentOrganizationId(partnership.getParentOrganizationId());
        dto.setMemberOrganizationId(partnership.getMemberOrganizationId());
        dto.setStatus(partnership.getStatus());
        dto.setInitiatedBy(partnership.getInitiatedBy());
        dto.setMessage(partnership.getMessage());
        dto.setEndedReason(partnership.getEndedReason());
        dto.setInitiatedAt(partnership.getInitiatedAt());
        dto.setAcceptedAt(partnership.getAcceptedAt());
        dto.setEndedAt(partnership.getEndedAt());

        Map<Long, Organization> orgMap = organizationRepository.findAllById(
                Arrays.asList(partnership.getParentOrganizationId(), partnership.getMemberOrganizationId()))
                .stream()
                .collect(Collectors.toMap(Organization::getId, o -> o));

        Organization parent = orgMap.get(partnership.getParentOrganizationId());
        if (parent != null) {
            dto.setParentOrganizationName(parent.getName());
            dto.setParentOrganizationHandle(parent.getHandle());
        }
        Organization member = orgMap.get(partnership.getMemberOrganizationId());
        if (member != null) {
            dto.setMemberOrganizationName(member.getName());
            dto.setMemberOrganizationHandle(member.getHandle());
        }

        if (OrganizationPartnership.Status.ACTIVE.name().equals(partnership.getStatus())
                || OrganizationPartnership.Status.SUSPENDED.name().equals(partnership.getStatus())) {
            ensureDefaultShareSettings(partnership);
            dto.setShareSettings(shareSettingRepository.findByPartnershipId(partnership.getId())
                    .stream()
                    .map(this::toShareSettingDto)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private OrganizationShareSettingDTO toShareSettingDto(OrganizationShareSetting setting) {
        OrganizationShareSettingDTO dto = new OrganizationShareSettingDTO();
        dto.setId(setting.getId());
        dto.setPartnershipId(setting.getPartnershipId());
        dto.setModuleKey(setting.getModuleKey());
        dto.setEnabled(setting.isEnabled());
        dto.setShareLevel(setting.getShareLevel());
        return dto;
    }

    private OrganizationDiscoveryDTO toDiscoveryDto(Organization org) {
        OrganizationDiscoveryDTO dto = new OrganizationDiscoveryDTO();
        dto.setId(org.getId());
        dto.setName(org.getName());
        dto.setHandle(org.getHandle());
        dto.setCity(org.getCity());
        dto.setCountry(org.getCountry());
        return dto;
    }

    private String trimMessage(String message) {
        if (message == null) {
            return null;
        }
        String trimmed = message.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Long requireOrganizationId() {
        Long orgId = TenantContext.getCurrentOrganizationId();
        if (orgId == null) {
            throw new IllegalStateException("Organization context is required for this operation.");
        }
        return orgId;
    }

    private Long currentUserId() {
        User user = authorizationService.getCurrentUser();
        return user != null ? user.getId() : null;
    }

    private void requireViewPermission() {
        if (!authorizationService.hasPermission("partnership.view")) {
            throw new AccessDeniedException("Insufficient permissions to view partnerships.");
        }
    }

    private void requireManagePermission() {
        if (!authorizationService.hasPermission("partnership.manage")) {
            throw new AccessDeniedException("Insufficient permissions to manage partnerships.");
        }
    }
}

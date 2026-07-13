package com.mosque.crm.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.FederatedGeneralEventDTO;
import com.mosque.crm.entity.GeneralEvent;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.OrganizationPartnership;
import com.mosque.crm.entity.User;
import com.mosque.crm.federation.FederationConstants;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.GeneralEventRepository;
import com.mosque.crm.repository.OrganizationPartnershipRepository;
import com.mosque.crm.repository.OrganizationRepository;

@Service
@Transactional
public class FederationPublicEventService {

    private final GeneralEventRepository generalEventRepository;
    private final OrganizationPartnershipRepository partnershipRepository;
    private final OrganizationRepository organizationRepository;
    private final AuthorizationService authorizationService;

    public FederationPublicEventService(
            GeneralEventRepository generalEventRepository,
            OrganizationPartnershipRepository partnershipRepository,
            OrganizationRepository organizationRepository,
            AuthorizationService authorizationService) {
        this.generalEventRepository = generalEventRepository;
        this.partnershipRepository = partnershipRepository;
        this.organizationRepository = organizationRepository;
        this.authorizationService = authorizationService;
    }

    public List<FederatedGeneralEventDTO> listFederationEvents() {
        requireViewPermission();
        Long orgId = requireOrganizationId();
        LocalDate today = LocalDate.now();
        boolean isParent = !partnershipRepository
                .findByParentOrganizationIdAndStatus(orgId, OrganizationPartnership.Status.ACTIVE.name())
                .isEmpty();

        List<GeneralEvent> events = authorizationService.withoutOrganizationFilter(() -> {
            List<GeneralEvent> results = new ArrayList<>();
            if (isParent) {
                results.addAll(generalEventRepository.findFederationEventsForParent(
                        orgId, FederationConstants.MODULE_PUBLIC_EVENTS, today));
            } else {
                partnershipRepository.findFirstByMemberOrganizationIdAndStatus(
                        orgId, OrganizationPartnership.Status.ACTIVE.name())
                        .ifPresent(partnership -> results.addAll(
                                generalEventRepository.findFederationEventsForSibling(
                                        partnership.getParentOrganizationId(),
                                        orgId,
                                        FederationConstants.MODULE_PUBLIC_EVENTS,
                                        today)));
            }
            return results;
        });

        return authorizationService.withoutOrganizationFilter(() -> events.stream()
                .distinct()
                .filter(event -> isParent || !event.isFederationHidden())
                .map(this::toFederatedDto)
                .collect(Collectors.toList()));
    }

    public FederatedGeneralEventDTO hideFromFederation(Long eventId, String reason) {
        requireModeratePermission();
        GeneralEvent event = authorizationService.withoutOrganizationFilter(() -> getEventForModeration(eventId));
        event.setFederationHidden(true);
        event.setFederationHiddenAt(LocalDateTime.now());
        event.setFederationHiddenByUserId(currentUserId());
        event.setFederationHiddenReason(reason);
        generalEventRepository.save(event);
        return authorizationService.withoutOrganizationFilter(() -> toFederatedDto(event));
    }

    public FederatedGeneralEventDTO unhideFromFederation(Long eventId) {
        requireModeratePermission();
        GeneralEvent event = authorizationService.withoutOrganizationFilter(() -> getEventForModeration(eventId));
        event.setFederationHidden(false);
        event.setFederationHiddenAt(null);
        event.setFederationHiddenByUserId(null);
        event.setFederationHiddenReason(null);
        generalEventRepository.save(event);
        return authorizationService.withoutOrganizationFilter(() -> toFederatedDto(event));
    }

    private GeneralEvent getEventForModeration(Long eventId) {
        Long orgId = requireOrganizationId();
        GeneralEvent event = generalEventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));
        if (!generalEventRepository.existsActivePartnership(orgId, event.getOrganizationId())) {
            throw new AccessDeniedException("You can only moderate events from member organizations.");
        }
        return event;
    }

    private FederatedGeneralEventDTO toFederatedDto(GeneralEvent event) {
        Organization org = organizationRepository.findById(event.getOrganizationId())
                .orElseThrow(() -> new IllegalStateException("Organization missing for event: " + event.getId()));

        FederatedGeneralEventDTO dto = new FederatedGeneralEventDTO();
        dto.setId(event.getId());
        dto.setName(event.getName());
        dto.setDescription(event.getDescription());
        dto.setGeneralEventType(event.getGeneralEventType() != null ? event.getGeneralEventType().name() : null);
        dto.setCustomTypeLabel(event.getCustomTypeLabel());
        dto.setLocation(event.getLocation());
        dto.setOnline(event.isOnline());
        dto.setMeetingUrl(event.getMeetingUrl());
        dto.setStartDate(event.getStartDate());
        dto.setEndDate(event.getEndDate());
        dto.setStartTime(event.getStartTime());
        dto.setEndTime(event.getEndTime());
        dto.setRequiresRegistration(event.isRequiresRegistration());
        dto.setRegistrationOpenDate(event.getRegistrationOpenDate());
        dto.setRegistrationCloseDate(event.getRegistrationCloseDate());
        dto.setMemberCapacity(event.getMemberCapacity());
        dto.setNonMemberCapacity(event.getNonMemberCapacity());
        dto.setAcceptNonMembers(event.isAcceptNonMembers());
        dto.setWaitlistEnabled(event.isWaitlistEnabled());
        dto.setTicketingType(event.getTicketingType());
        dto.setTicketPrice(event.getTicketPrice());
        dto.setCurrency(event.getCurrency());
        dto.setStatus(event.getStatus() != null ? event.getStatus().name() : null);
        dto.setVisibility(event.getVisibility());
        dto.setFeatured(event.isFeatured());
        dto.setRequiresCheckIn(event.isRequiresCheckIn());
        dto.setHostedByOrganizationName(org.getName());
        dto.setHostedByOrganizationHandle(org.getHandle());
        dto.setFederationHidden(event.isFederationHidden());
        dto.setFederationHiddenReason(event.getFederationHiddenReason());
        return dto;
    }

    private Long currentUserId() {
        User user = authorizationService.getCurrentUser();
        return user != null ? user.getId() : null;
    }

    private Long requireOrganizationId() {
        Long orgId = TenantContext.getCurrentOrganizationId();
        if (orgId == null) {
            throw new IllegalStateException("Organization context is required for this operation.");
        }
        return orgId;
    }

    private void requireViewPermission() {
        if (!authorizationService.hasPermission("public_events.view")) {
            throw new AccessDeniedException("Insufficient permissions to view federation public events.");
        }
    }

    private void requireModeratePermission() {
        if (!authorizationService.hasPermission("public_events.moderate")) {
            throw new AccessDeniedException("Insufficient permissions to moderate federation public events.");
        }
    }
}

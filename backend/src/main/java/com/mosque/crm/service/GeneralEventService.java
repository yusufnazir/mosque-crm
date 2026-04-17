package com.mosque.crm.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.GeneralEventCreateDTO;
import com.mosque.crm.dto.GeneralEventDTO;
import com.mosque.crm.dto.GeneralEventRegistrationCreateDTO;
import com.mosque.crm.dto.GeneralEventRegistrationDTO;
import com.mosque.crm.dto.GeneralEventReportDTO;
import com.mosque.crm.dto.GeneralEventVolunteerCreateDTO;
import com.mosque.crm.dto.GeneralEventVolunteerDTO;
import com.mosque.crm.entity.GeneralEvent;
import com.mosque.crm.entity.GeneralEventRegistration;
import com.mosque.crm.entity.GeneralEventVolunteer;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.CheckInStatus;
import com.mosque.crm.enums.GeneralEventStatus;
import com.mosque.crm.enums.GeneralEventType;
import com.mosque.crm.enums.RegistrantType;
import com.mosque.crm.enums.RsvpStatus;
import com.mosque.crm.enums.VolunteerStatus;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.GeneralEventRegistrationRepository;
import com.mosque.crm.repository.GeneralEventRepository;
import com.mosque.crm.repository.DistributionEventRepository;
import com.mosque.crm.repository.GeneralEventVolunteerRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanLimitExceededException;

@Service
public class GeneralEventService {

    private static final Logger log = LoggerFactory.getLogger(GeneralEventService.class);

    private final GeneralEventRepository generalEventRepository;
    private final DistributionEventRepository distributionEventRepository;
    private final GeneralEventRegistrationRepository registrationRepository;
    private final GeneralEventVolunteerRepository volunteerRepository;
    private final PersonRepository personRepository;
    private final OrganizationSubscriptionService organizationSubscriptionService;

    public GeneralEventService(
            GeneralEventRepository generalEventRepository,
            DistributionEventRepository distributionEventRepository,
            GeneralEventRegistrationRepository registrationRepository,
            GeneralEventVolunteerRepository volunteerRepository,
            PersonRepository personRepository,
            OrganizationSubscriptionService organizationSubscriptionService) {
        this.generalEventRepository = generalEventRepository;
        this.distributionEventRepository = distributionEventRepository;
        this.registrationRepository = registrationRepository;
        this.volunteerRepository = volunteerRepository;
        this.personRepository = personRepository;
        this.organizationSubscriptionService = organizationSubscriptionService;
    }

    // ========================
    // Events
    // ========================

    @Transactional
    public GeneralEventDTO createEvent(GeneralEventCreateDTO dto) {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId != null) {
            try {
                Integer eventLimit = organizationSubscriptionService.getFeatureLimit(organizationId, FeatureKeys.EVENTS_MAX);
                if (eventLimit != null) {
                    long currentCount = generalEventRepository.count() + distributionEventRepository.count();
                    if (currentCount >= eventLimit) {
                        throw new PlanLimitExceededException(FeatureKeys.EVENTS_MAX, eventLimit, (int) currentCount);
                    }
                }
            } catch (PlanLimitExceededException e) {
                throw e;
            } catch (RuntimeException e) {
                // No active subscription — allow creation
            }
        }

        GeneralEvent event = new GeneralEvent();
        applyDtoToEvent(dto, event);
        if (event.isRequiresCheckIn()) {
            event.setCheckInCode(generateCheckInCode());
        }
        event = generalEventRepository.save(event);
        log.info("Created general event: {} (id={})", event.getName(), event.getId());
        return toEventDTO(event);
    }

    @Transactional
    public GeneralEventDTO updateEvent(Long id, GeneralEventCreateDTO dto) {
        GeneralEvent event = generalEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("General event not found: " + id));
        applyDtoToEvent(dto, event);
        if (event.isRequiresCheckIn() && event.getCheckInCode() == null) {
            event.setCheckInCode(generateCheckInCode());
        }
        event = generalEventRepository.save(event);
        log.info("Updated general event: {} (id={})", event.getName(), event.getId());
        return toEventDTO(event);
    }

    @Transactional
    public GeneralEventDTO updateEventStatus(Long id, String statusStr) {
        GeneralEvent event = generalEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("General event not found: " + id));
        event.setStatus(GeneralEventStatus.valueOf(statusStr));
        event = generalEventRepository.save(event);
        log.info("Updated general event status: id={} status={}", id, statusStr);
        return toEventDTO(event);
    }

    public GeneralEventDTO getEvent(Long id) {
        GeneralEvent event = generalEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("General event not found: " + id));
        return toEventDTO(event);
    }

    public List<GeneralEventDTO> listEvents() {
        return generalEventRepository.findAllByOrderByStartDateDescCreatedAtDesc()
                .stream().map(this::toEventDTO).collect(Collectors.toList());
    }

    @Transactional
    public void deleteEvent(Long id) {
        GeneralEvent event = generalEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("General event not found: " + id));
        generalEventRepository.delete(event);
        log.info("Deleted general event id={}", id);
    }

    public GeneralEventReportDTO getReport(Long id) {
        GeneralEvent event = generalEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("General event not found: " + id));
        List<GeneralEventRegistration> regs = registrationRepository.findByGeneralEventIdOrderByRegisteredAtDesc(id);
        List<GeneralEventVolunteer> vols = volunteerRepository.findByGeneralEventIdOrderByCreatedAtDesc(id);

        GeneralEventReportDTO report = new GeneralEventReportDTO();
        report.setEventId(id);
        report.setEventName(event.getName());
        report.setTotalRegistrations(regs.size());
        report.setConfirmedRegistrations((int) regs.stream().filter(r -> r.getRsvpStatus() == RsvpStatus.CONFIRMED).count());
        report.setDeclinedRegistrations((int) regs.stream().filter(r -> r.getRsvpStatus() == RsvpStatus.DECLINED).count());
        report.setWaitlistRegistrations((int) regs.stream().filter(r -> r.getRsvpStatus() == RsvpStatus.WAITLIST).count());
        report.setCheckedInCount((int) regs.stream().filter(r -> r.getCheckInStatus() == CheckInStatus.CHECKED_IN).count());
        report.setAbsentCount((int) regs.stream().filter(r -> r.getCheckInStatus() == CheckInStatus.ABSENT).count());
        report.setMemberRegistrations((int) regs.stream().filter(r -> r.getRegistrantType() == RegistrantType.MEMBER).count());
        report.setNonMemberRegistrations((int) regs.stream().filter(r -> r.getRegistrantType() == RegistrantType.NON_MEMBER).count());
        report.setTotalPartySize(regs.stream().mapToInt(GeneralEventRegistration::getPartySize).sum());
        report.setTotalRevenue(regs.stream()
                .filter(r -> r.getAmountPaid() != null)
                .map(GeneralEventRegistration::getAmountPaid)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        report.setVolunteerCount(vols.size());
        return report;
    }

    // ========================
    // Registrations
    // ========================

    @Transactional
    public GeneralEventRegistrationDTO addRegistration(GeneralEventRegistrationCreateDTO dto) {
        GeneralEvent event = generalEventRepository.findById(dto.getGeneralEventId())
                .orElseThrow(() -> new RuntimeException("General event not found: " + dto.getGeneralEventId()));

        GeneralEventRegistration reg = new GeneralEventRegistration();
        reg.setGeneralEvent(event);
        reg.setRegistrantType(RegistrantType.valueOf(dto.getRegistrantType()));
        reg.setName(dto.getName());
        reg.setEmail(dto.getEmail());
        reg.setPhoneNumber(dto.getPhoneNumber());
        reg.setPartySize(dto.getPartySize() > 0 ? dto.getPartySize() : 1);
        reg.setRsvpStatus(dto.getRsvpStatus() != null ? RsvpStatus.valueOf(dto.getRsvpStatus()) : RsvpStatus.CONFIRMED);
        reg.setSpecialRequests(dto.getSpecialRequests());
        reg.setAmountPaid(dto.getAmountPaid());
        reg.setRegisteredAt(LocalDateTime.now());
        reg.setSource(dto.getSource() != null ? dto.getSource() : "ADMIN_MANUAL");

        if (dto.getPersonId() != null) {
            Person person = personRepository.findById(dto.getPersonId())
                    .orElseThrow(() -> new RuntimeException("Person not found: " + dto.getPersonId()));
            reg.setPerson(person);
        }

        reg = registrationRepository.save(reg);
        log.info("Added registration {} to general event {}", reg.getId(), event.getId());
        return toRegistrationDTO(reg);
    }

    @Transactional
    public GeneralEventRegistrationDTO updateRegistration(Long id, GeneralEventRegistrationCreateDTO dto) {
        GeneralEventRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registration not found: " + id));
        reg.setName(dto.getName());
        reg.setEmail(dto.getEmail());
        reg.setPhoneNumber(dto.getPhoneNumber());
        reg.setPartySize(dto.getPartySize() > 0 ? dto.getPartySize() : 1);
        reg.setRsvpStatus(dto.getRsvpStatus() != null ? RsvpStatus.valueOf(dto.getRsvpStatus()) : reg.getRsvpStatus());
        reg.setSpecialRequests(dto.getSpecialRequests());
        reg.setAmountPaid(dto.getAmountPaid());
        reg = registrationRepository.save(reg);
        return toRegistrationDTO(reg);
    }

    @Transactional
    public GeneralEventRegistrationDTO checkIn(Long id) {
        GeneralEventRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registration not found: " + id));
        reg.setCheckInStatus(CheckInStatus.CHECKED_IN);
        reg.setCheckedInAt(LocalDateTime.now());
        reg = registrationRepository.save(reg);
        log.info("Checked in registration id={}", id);
        return toRegistrationDTO(reg);
    }

    @Transactional
    public void deleteRegistration(Long id) {
        GeneralEventRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registration not found: " + id));
        registrationRepository.delete(reg);
        log.info("Deleted registration id={}", id);
    }

    public List<GeneralEventRegistrationDTO> listRegistrations(Long eventId) {
        return registrationRepository.findByGeneralEventIdOrderByRegisteredAtDesc(eventId)
                .stream().map(this::toRegistrationDTO).collect(Collectors.toList());
    }

    // ========================
    // Volunteers
    // ========================

    @Transactional
    public GeneralEventVolunteerDTO addVolunteer(GeneralEventVolunteerCreateDTO dto) {
        GeneralEvent event = generalEventRepository.findById(dto.getGeneralEventId())
                .orElseThrow(() -> new RuntimeException("General event not found: " + dto.getGeneralEventId()));
        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found: " + dto.getPersonId()));

        GeneralEventVolunteer vol = new GeneralEventVolunteer();
        vol.setGeneralEvent(event);
        vol.setPerson(person);
        vol.setRole(dto.getRole());
        vol.setRoleDescription(dto.getRoleDescription());
        vol.setStatus(dto.getStatus() != null ? VolunteerStatus.valueOf(dto.getStatus()) : VolunteerStatus.INVITED);
        vol = volunteerRepository.save(vol);
        log.info("Added volunteer {} to general event {}", vol.getId(), event.getId());
        return toVolunteerDTO(vol);
    }

    @Transactional
    public GeneralEventVolunteerDTO updateVolunteer(Long id, GeneralEventVolunteerCreateDTO dto) {
        GeneralEventVolunteer vol = volunteerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Volunteer not found: " + id));
        vol.setRole(dto.getRole());
        vol.setRoleDescription(dto.getRoleDescription());
        if (dto.getStatus() != null) {
            vol.setStatus(VolunteerStatus.valueOf(dto.getStatus()));
        }
        vol = volunteerRepository.save(vol);
        return toVolunteerDTO(vol);
    }

    @Transactional
    public void deleteVolunteer(Long id) {
        GeneralEventVolunteer vol = volunteerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Volunteer not found: " + id));
        volunteerRepository.delete(vol);
        log.info("Deleted volunteer id={}", id);
    }

    public List<GeneralEventVolunteerDTO> listVolunteers(Long eventId) {
        return volunteerRepository.findByGeneralEventIdOrderByCreatedAtDesc(eventId)
                .stream().map(this::toVolunteerDTO).collect(Collectors.toList());
    }

    // ========================
    // Mapping helpers
    // ========================

    private void applyDtoToEvent(GeneralEventCreateDTO dto, GeneralEvent event) {
        event.setName(dto.getName());
        event.setDescription(dto.getDescription());
        event.setGeneralEventType(GeneralEventType.valueOf(dto.getGeneralEventType()));
        event.setCustomTypeLabel(dto.getCustomTypeLabel());
        event.setLocation(dto.getLocation());
        event.setOnline(dto.isOnline());
        event.setMeetingUrl(dto.getMeetingUrl());
        event.setStartDate(dto.getStartDate());
        event.setEndDate(dto.getEndDate());
        event.setStartTime(dto.getStartTime());
        event.setEndTime(dto.getEndTime());
        event.setRequiresRegistration(dto.isRequiresRegistration());
        event.setRegistrationOpenDate(dto.getRegistrationOpenDate());
        event.setRegistrationCloseDate(dto.getRegistrationCloseDate());
        event.setMemberCapacity(dto.getMemberCapacity());
        event.setNonMemberCapacity(dto.getNonMemberCapacity());
        event.setAcceptNonMembers(dto.isAcceptNonMembers());
        event.setWaitlistEnabled(dto.isWaitlistEnabled());
        event.setTicketingType(dto.getTicketingType() != null ? dto.getTicketingType() : "NONE");
        event.setTicketPrice(dto.getTicketPrice());
        event.setCurrency(dto.getCurrency());
        event.setStatus(dto.getStatus() != null ? GeneralEventStatus.valueOf(dto.getStatus()) : GeneralEventStatus.DRAFT);
        event.setVisibility(dto.getVisibility() != null ? dto.getVisibility() : "MEMBERS_ONLY");
        event.setFeatured(dto.isFeatured());
        event.setRequiresCheckIn(dto.isRequiresCheckIn());
    }

    private GeneralEventDTO toEventDTO(GeneralEvent event) {
        GeneralEventDTO dto = new GeneralEventDTO();
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
        dto.setCheckInCode(event.getCheckInCode());
        dto.setTotalRegistrations(event.getRegistrations().size());
        dto.setTotalVolunteers(event.getVolunteers().size());
        dto.setCreatedAt(event.getCreatedAt());
        dto.setUpdatedAt(event.getUpdatedAt());
        return dto;
    }

    private GeneralEventRegistrationDTO toRegistrationDTO(GeneralEventRegistration reg) {
        GeneralEventRegistrationDTO dto = new GeneralEventRegistrationDTO();
        dto.setId(reg.getId());
        dto.setGeneralEventId(reg.getGeneralEvent() != null ? reg.getGeneralEvent().getId() : null);
        dto.setRegistrantType(reg.getRegistrantType() != null ? reg.getRegistrantType().name() : null);
        dto.setPersonId(reg.getPerson() != null ? reg.getPerson().getId() : null);
        dto.setName(reg.getName());
        dto.setEmail(reg.getEmail());
        dto.setPhoneNumber(reg.getPhoneNumber());
        dto.setPartySize(reg.getPartySize());
        dto.setRsvpStatus(reg.getRsvpStatus() != null ? reg.getRsvpStatus().name() : null);
        dto.setCheckInStatus(reg.getCheckInStatus() != null ? reg.getCheckInStatus().name() : null);
        dto.setCheckedInAt(reg.getCheckedInAt());
        dto.setSpecialRequests(reg.getSpecialRequests());
        dto.setAmountPaid(reg.getAmountPaid());
        dto.setRegisteredAt(reg.getRegisteredAt());
        dto.setSource(reg.getSource());
        dto.setCreatedAt(reg.getCreatedAt());
        dto.setUpdatedAt(reg.getUpdatedAt());
        return dto;
    }

    private GeneralEventVolunteerDTO toVolunteerDTO(GeneralEventVolunteer vol) {
        GeneralEventVolunteerDTO dto = new GeneralEventVolunteerDTO();
        dto.setId(vol.getId());
        dto.setGeneralEventId(vol.getGeneralEvent() != null ? vol.getGeneralEvent().getId() : null);
        dto.setPersonId(vol.getPerson() != null ? vol.getPerson().getId() : null);
        if (vol.getPerson() != null) {
            dto.setPersonName(vol.getPerson().getFirstName() + " " + vol.getPerson().getLastName());
        }
        dto.setRole(vol.getRole());
        dto.setRoleDescription(vol.getRoleDescription());
        dto.setStatus(vol.getStatus() != null ? vol.getStatus().name() : null);
        dto.setCheckedIn(vol.isCheckedIn());
        dto.setCreatedAt(vol.getCreatedAt());
        dto.setUpdatedAt(vol.getUpdatedAt());
        return dto;
    }

    private String generateCheckInCode() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }
}

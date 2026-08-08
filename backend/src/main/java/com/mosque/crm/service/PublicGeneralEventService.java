package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.GeneralEventRegistrationDTO;
import com.mosque.crm.dto.PublicGeneralEventDTO;
import com.mosque.crm.dto.PublicGeneralEventSelfRegisterDTO;
import com.mosque.crm.entity.GeneralEvent;
import com.mosque.crm.entity.GeneralEventRegistration;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.User;
import com.mosque.crm.enums.CheckInStatus;
import com.mosque.crm.enums.GeneralEventStatus;
import com.mosque.crm.enums.RegistrantType;
import com.mosque.crm.enums.RsvpStatus;
import com.mosque.crm.repository.GeneralEventRegistrationRepository;
import com.mosque.crm.repository.GeneralEventRepository;
import com.mosque.crm.repository.MembershipRepository;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.UserMemberLinkRepository;

@Service
public class PublicGeneralEventService {

    private static final Logger log = LoggerFactory.getLogger(PublicGeneralEventService.class);
    private static final String SOURCE_SELF = "SELF";

    private final OrganizationRepository organizationRepository;
    private final GeneralEventRepository generalEventRepository;
    private final GeneralEventRegistrationRepository registrationRepository;
    private final PersonRepository personRepository;
    private final MembershipRepository membershipRepository;
    private final UserMemberLinkRepository userMemberLinkRepository;
    private final AuthorizationService authorizationService;

    public PublicGeneralEventService(
            OrganizationRepository organizationRepository,
            GeneralEventRepository generalEventRepository,
            GeneralEventRegistrationRepository registrationRepository,
            PersonRepository personRepository,
            MembershipRepository membershipRepository,
            UserMemberLinkRepository userMemberLinkRepository,
            AuthorizationService authorizationService) {
        this.organizationRepository = organizationRepository;
        this.generalEventRepository = generalEventRepository;
        this.registrationRepository = registrationRepository;
        this.personRepository = personRepository;
        this.membershipRepository = membershipRepository;
        this.userMemberLinkRepository = userMemberLinkRepository;
        this.authorizationService = authorizationService;
    }

    public PublicGeneralEventDTO getPublicEvent(String orgHandle, Long eventId) {
        return authorizationService.withoutOrganizationFilter(() -> {
            Organization org = resolveOrganization(orgHandle);
            GeneralEvent event = loadPublicEvent(org, eventId);
            return toPublicDto(org, event);
        });
    }

    @Transactional
    public GeneralEventRegistrationDTO selfRegister(String orgHandle, Long eventId,
            PublicGeneralEventSelfRegisterDTO dto) {
        return authorizationService.withoutOrganizationFilter(() -> {
            Organization org = resolveOrganization(orgHandle);
            GeneralEvent event = loadPublicEvent(org, eventId);

            if (!event.isRequiresRegistration()) {
                throw new IllegalArgumentException("This event does not require registration");
            }
            if (!isRegistrationWindowOpen(event)) {
                throw new IllegalArgumentException("Registration is not open for this event");
            }

            Person linkedPerson = resolveLinkedPersonForOrg(org.getId());

            if (dto.isOptIn()) {
                return registerOptIn(event, org, linkedPerson);
            }
            return registerGuest(event, org, dto, linkedPerson);
        });
    }

    private GeneralEventRegistrationDTO registerOptIn(GeneralEvent event, Organization org, Person linkedPerson) {
        if (linkedPerson == null) {
            throw new IllegalArgumentException(
                    "You must be logged in with a linked member profile to register without the form");
        }
        if (registrationRepository.existsByGeneralEventIdAndPersonId(event.getId(), linkedPerson.getId())) {
            throw new IllegalArgumentException("You are already registered for this event");
        }

        RegistrantType type = membershipRepository.findActiveMembershipByPerson(linkedPerson).isPresent()
                ? RegistrantType.MEMBER
                : RegistrantType.NON_MEMBER;

        if (type == RegistrantType.NON_MEMBER && !event.isAcceptNonMembers()) {
            throw new IllegalArgumentException("This event is for members only");
        }

        RsvpStatus rsvp = resolveRsvpStatus(event, type);
        return saveRegistration(event, org, type, linkedPerson,
                displayName(linkedPerson),
                linkedPerson.getEmail(),
                linkedPerson.getPhone(),
                1,
                null,
                rsvp);
    }

    private GeneralEventRegistrationDTO registerGuest(GeneralEvent event, Organization org,
            PublicGeneralEventSelfRegisterDTO dto, Person linkedPerson) {
        String firstName = trimToNull(dto.getFirstName());
        String lastName = trimToNull(dto.getLastName());
        if (firstName == null || lastName == null) {
            String legacyName = trimToNull(dto.getName());
            if (legacyName != null) {
                String[] parts = legacyName.split("\\s+", 2);
                if (firstName == null) {
                    firstName = parts[0];
                }
                if (lastName == null && parts.length > 1) {
                    lastName = parts[1];
                }
            }
        }
        String name = composeDisplayName(firstName, lastName, null);
        String email = normalizeEmail(dto.getEmail());
        String phone = event.isPublicFormShowPhone() ? trimToNull(dto.getPhoneNumber()) : null;
        int partySize = event.isPublicFormShowPartySize() && dto.getPartySize() > 0 ? dto.getPartySize() : 1;
        String specialRequests = event.isPublicFormShowSpecialRequests()
                ? trimToNull(dto.getSpecialRequests())
                : null;

        if (firstName == null) {
            throw new IllegalArgumentException("First name is required");
        }
        if (lastName == null) {
            throw new IllegalArgumentException("Last name is required");
        }
        if (email == null) {
            throw new IllegalArgumentException("Email is required");
        }

        if (registrationRepository.existsActiveByEventIdAndEmail(event.getId(), email)) {
            throw new IllegalArgumentException("This email is already registered for this event");
        }

        Person matched = matchPerson(org.getId(), email, phone, firstName, lastName);
        // Prefer the logged-in linked person when their email matches the form
        if (linkedPerson != null && emailEquals(linkedPerson.getEmail(), email)) {
            matched = linkedPerson;
        }

        if (matched != null
                && registrationRepository.existsByGeneralEventIdAndPersonId(event.getId(), matched.getId())) {
            throw new IllegalArgumentException("You are already registered for this event");
        }

        RegistrantType type = RegistrantType.NON_MEMBER;
        if (matched != null && membershipRepository.findActiveMembershipByPerson(matched).isPresent()) {
            type = RegistrantType.MEMBER;
        }

        if (type == RegistrantType.NON_MEMBER && !event.isAcceptNonMembers()) {
            throw new IllegalArgumentException("This event is for members only");
        }

        RsvpStatus rsvp = resolveRsvpStatus(event, type);
        String phoneToStore = phone != null ? phone : (matched != null ? matched.getPhone() : null);
        return saveRegistration(event, org, type, matched, name, email, phoneToStore, partySize,
                specialRequests, rsvp);
    }

    private GeneralEventRegistrationDTO saveRegistration(
            GeneralEvent event,
            Organization org,
            RegistrantType type,
            Person person,
            String name,
            String email,
            String phone,
            int partySize,
            String specialRequests,
            RsvpStatus rsvpStatus) {

        GeneralEventRegistration reg = new GeneralEventRegistration();
        reg.setGeneralEvent(event);
        reg.setRegistrantType(type);
        reg.setPerson(person);
        reg.setName(name);
        reg.setEmail(email);
        reg.setPhoneNumber(phone);
        reg.setPartySize(partySize);
        reg.setRsvpStatus(rsvpStatus);
        reg.setCheckInStatus(CheckInStatus.NOT_CHECKED_IN);
        reg.setSpecialRequests(specialRequests);
        reg.setRegisteredAt(LocalDateTime.now());
        reg.setSource(SOURCE_SELF);
        reg.setOrganizationId(org.getId());

        reg = registrationRepository.save(reg);
        log.info("Public self-registration id={} eventId={} type={} source=SELF",
                reg.getId(), event.getId(), type);
        return toRegistrationDTO(reg);
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

    private RsvpStatus resolveRsvpStatus(GeneralEvent event, RegistrantType type) {
        long confirmed = registrationRepository.countByGeneralEventIdAndRegistrantTypeAndRsvpStatus(
                event.getId(), type, RsvpStatus.CONFIRMED);
        Integer capacity = type == RegistrantType.MEMBER
                ? event.getMemberCapacity()
                : event.getNonMemberCapacity();

        if (capacity != null && capacity > 0 && confirmed >= capacity) {
            if (event.isWaitlistEnabled()) {
                return RsvpStatus.WAITLIST;
            }
            throw new IllegalArgumentException("This event is full");
        }
        return RsvpStatus.CONFIRMED;
    }

    private Person matchPerson(Long organizationId, String email, String phone,
            String firstName, String lastName) {
        Optional<Person> byEmail = personRepository.findByEmailIgnoreCaseAndOrganizationId(email, organizationId);
        if (byEmail.isPresent()) {
            return byEmail.get();
        }
        if (phone != null) {
            for (String variant : phoneVariants(phone)) {
                List<Person> found = personRepository.findByPhoneAndOrganizationId(variant, organizationId);
                if (found.size() == 1) {
                    return found.get(0);
                }
            }
        }
        // Only match on name when exactly one person in the org has this first+last
        if (firstName != null && lastName != null) {
            List<Person> byName = personRepository.findByOrganizationIdAndFirstNameAndLastNameIgnoreCase(
                    organizationId, firstName, lastName);
            if (byName.size() == 1) {
                return byName.get(0);
            }
        }
        return null;
    }

    private static String composeDisplayName(String firstName, String lastName, String legacyName) {
        if (firstName != null || lastName != null) {
            return ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
        }
        return legacyName;
    }

    private Organization resolveOrganization(String orgHandle) {
        if (orgHandle == null || orgHandle.isBlank()) {
            throw new IllegalArgumentException("Organization not found");
        }
        return organizationRepository.findByHandle(orgHandle.trim())
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + orgHandle));
    }

    private GeneralEvent loadPublicEvent(Organization org, Long eventId) {
        GeneralEvent event = generalEventRepository.findByIdAndOrganizationId(eventId, org.getId())
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        if (!"PUBLIC".equals(event.getVisibility())) {
            throw new IllegalArgumentException("Event is not publicly available");
        }
        GeneralEventStatus status = event.getStatus();
        if (status != GeneralEventStatus.PUBLISHED && status != GeneralEventStatus.ACTIVE) {
            throw new IllegalArgumentException("Event is not open for registration");
        }
        return event;
    }

    private PublicGeneralEventDTO toPublicDto(Organization org, GeneralEvent event) {
        PublicGeneralEventDTO dto = new PublicGeneralEventDTO();
        dto.setId(event.getId());
        dto.setName(event.getName());
        dto.setDescription(event.getDescription());
        dto.setGeneralEventType(event.getGeneralEventType() != null ? event.getGeneralEventType().name() : null);
        dto.setCustomTypeLabel(event.getCustomTypeLabel());
        dto.setLocation(event.getLocation());
        dto.setOnline(event.isOnline());
        dto.setStartDate(event.getStartDate());
        dto.setEndDate(event.getEndDate());
        dto.setStartTime(event.getStartTime());
        dto.setEndTime(event.getEndTime());
        dto.setRequiresRegistration(event.isRequiresRegistration());
        dto.setRegistrationOpenDate(event.getRegistrationOpenDate());
        dto.setRegistrationCloseDate(event.getRegistrationCloseDate());
        dto.setAcceptNonMembers(event.isAcceptNonMembers());
        dto.setWaitlistEnabled(event.isWaitlistEnabled());
        dto.setPublicFormShowPhone(event.isPublicFormShowPhone());
        dto.setPublicFormShowPartySize(event.isPublicFormShowPartySize());
        dto.setPublicFormShowSpecialRequests(event.isPublicFormShowSpecialRequests());
        dto.setTicketingType(event.getTicketingType());
        dto.setTicketPrice(event.getTicketPrice());
        dto.setCurrency(event.getCurrency());
        dto.setStatus(event.getStatus() != null ? event.getStatus().name() : null);
        dto.setOrganizationName(org.getName());
        dto.setOrganizationHandle(org.getHandle());
        dto.setRegistrationOpen(event.isRequiresRegistration() && isRegistrationWindowOpen(event));
        dto.setSpotsRemaining(computeSpotsRemaining(event));

        Person linked = resolveLinkedPersonForOrg(org.getId());
        if (linked != null) {
            dto.setCanOptIn(true);
            dto.setOptInDisplayName(displayName(linked));
            dto.setOptInEmail(linked.getEmail());
            dto.setAlreadyRegistered(
                    registrationRepository.existsByGeneralEventIdAndPersonId(event.getId(), linked.getId()));
        }
        return dto;
    }

    private Integer computeSpotsRemaining(GeneralEvent event) {
        Integer memberCap = event.getMemberCapacity();
        Integer nonMemberCap = event.isAcceptNonMembers() ? event.getNonMemberCapacity() : Integer.valueOf(0);

        if (memberCap == null && nonMemberCap == null) {
            return null;
        }

        int remaining = 0;
        boolean anyFinite = false;
        if (memberCap != null) {
            anyFinite = true;
            long used = registrationRepository.countByGeneralEventIdAndRegistrantTypeAndRsvpStatus(
                    event.getId(), RegistrantType.MEMBER, RsvpStatus.CONFIRMED);
            remaining += Math.max(0, memberCap - (int) used);
        }
        if (event.isAcceptNonMembers() && nonMemberCap != null) {
            anyFinite = true;
            long used = registrationRepository.countByGeneralEventIdAndRegistrantTypeAndRsvpStatus(
                    event.getId(), RegistrantType.NON_MEMBER, RsvpStatus.CONFIRMED);
            remaining += Math.max(0, nonMemberCap - (int) used);
        } else if (event.isAcceptNonMembers() && nonMemberCap == null && memberCap != null) {
            // Unlimited non-members → overall remaining is unlimited
            return null;
        } else if (!event.isAcceptNonMembers() && memberCap == null) {
            return null;
        }

        return anyFinite ? remaining : null;
    }

    private boolean isRegistrationWindowOpen(GeneralEvent event) {
        LocalDateTime now = LocalDateTime.now();
        if (event.getRegistrationOpenDate() != null && now.isBefore(event.getRegistrationOpenDate())) {
            return false;
        }
        if (event.getRegistrationCloseDate() != null && now.isAfter(event.getRegistrationCloseDate())) {
            return false;
        }
        return true;
    }

    private Person resolveLinkedPersonForOrg(Long organizationId) {
        User user = authorizationService.getCurrentUser();
        if (user == null) {
            return null;
        }
        return userMemberLinkRepository.findByUserId(user.getId())
                .map(link -> link.getPerson())
                .filter(person -> person != null && Objects.equals(person.getOrganizationId(), organizationId))
                .orElse(null);
    }

    private static String displayName(Person person) {
        String first = person.getFirstName() != null ? person.getFirstName() : "";
        String last = person.getLastName() != null ? person.getLastName() : "";
        return (first + " " + last).trim();
    }

    private static String normalizeEmail(String email) {
        String trimmed = trimToNull(email);
        return trimmed != null ? trimmed.toLowerCase(Locale.ROOT) : null;
    }

    private static boolean emailEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return a.trim().equalsIgnoreCase(b.trim());
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    private static List<String> phoneVariants(String phone) {
        String trimmed = phone.trim();
        String noSpaces = trimmed.replace(" ", "");
        String digits = digitsOnly(phone);
        return List.of(trimmed, noSpaces, digits).stream().distinct().toList();
    }
}

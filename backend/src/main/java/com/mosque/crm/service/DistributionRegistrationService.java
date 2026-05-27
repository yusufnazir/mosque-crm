package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.DistributionRegistrationCreateDTO;
import com.mosque.crm.dto.DistributionRegistrationDTO;
import com.mosque.crm.dto.DistributionRegistrationTypeCreateDTO;
import com.mosque.crm.dto.DistributionRegistrationTypeDTO;
import com.mosque.crm.dto.DistributionRegistrationUpdateDTO;
import com.mosque.crm.entity.DistributionEvent;
import com.mosque.crm.entity.DistributionRegistration;
import com.mosque.crm.entity.DistributionRegistrationType;
import com.mosque.crm.entity.NonMemberRecipient;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.DistributionEventStatus;
import com.mosque.crm.enums.RegistrationFulfillmentMode;
import com.mosque.crm.enums.RegistrationStatus;
import com.mosque.crm.repository.DistributionEventRepository;
import com.mosque.crm.repository.DistributionRegistrationRepository;
import com.mosque.crm.repository.DistributionRegistrationTypeRepository;
import com.mosque.crm.repository.NonMemberRecipientRepository;
import com.mosque.crm.repository.ParcelDistributionRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.enums.RecipientType;

@Service
public class DistributionRegistrationService {

    private final DistributionEventRepository eventRepository;
    private final DistributionRegistrationTypeRepository typeRepository;
    private final DistributionRegistrationRepository registrationRepository;
    private final PersonRepository personRepository;
    private final NonMemberRecipientRepository nonMemberRecipientRepository;
    private final ParcelDistributionRepository parcelDistributionRepository;

    public DistributionRegistrationService(
            DistributionEventRepository eventRepository,
            DistributionRegistrationTypeRepository typeRepository,
            DistributionRegistrationRepository registrationRepository,
            PersonRepository personRepository,
            NonMemberRecipientRepository nonMemberRecipientRepository,
            ParcelDistributionRepository parcelDistributionRepository) {
        this.eventRepository = eventRepository;
        this.typeRepository = typeRepository;
        this.registrationRepository = registrationRepository;
        this.personRepository = personRepository;
        this.nonMemberRecipientRepository = nonMemberRecipientRepository;
        this.parcelDistributionRepository = parcelDistributionRepository;
    }

    @Transactional(readOnly = true)
    public List<DistributionRegistrationTypeDTO> listTypes(Long eventId) {
        validateEvent(eventId);
        migrateLegacyRecipientsIfNeeded(eventId);
        return typeRepository.findByDistributionEventIdOrderBySortOrderAscNameAsc(eventId)
                .stream().map(t -> toTypeDTO(t, registrationRepository.countByRegistrationTypeId(t.getId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public DistributionRegistrationTypeDTO createType(Long eventId, DistributionRegistrationTypeCreateDTO dto) {
        DistributionEvent event = validateEvent(eventId);
        if (typeRepository.findByDistributionEventIdAndNameIgnoreCase(eventId, dto.getName().trim()).isPresent()) {
            throw new RuntimeException("Registration type already exists: " + dto.getName());
        }
        DistributionRegistrationType type = new DistributionRegistrationType();
        type.setDistributionEvent(event);
        type.setName(dto.getName().trim());
        type.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : nextSortOrder(eventId));
        type.setFulfillmentMode(dto.getFulfillmentMode());
        type.setDefaultPlannedParcels(dto.getDefaultPlannedParcels());
        type.setSoftLimit(dto.getSoftLimit());
        type.setAssignDistributionNumber(Boolean.TRUE.equals(dto.getAssignDistributionNumber()));
        return toTypeDTO(typeRepository.save(type), 0);
    }

    @Transactional
    public DistributionRegistrationTypeDTO updateType(Long typeId, DistributionRegistrationTypeCreateDTO dto) {
        DistributionRegistrationType type = typeRepository.findById(typeId)
                .orElseThrow(() -> new RuntimeException("Registration type not found: " + typeId));
        String name = dto.getName().trim();
        if (!name.equalsIgnoreCase(type.getName())
                && typeRepository.findByDistributionEventIdAndNameIgnoreCase(
                        type.getDistributionEvent().getId(), name).isPresent()) {
            throw new RuntimeException("Registration type already exists: " + name);
        }
        type.setName(name);
        if (dto.getSortOrder() != null) {
            type.setSortOrder(dto.getSortOrder());
        }
        type.setFulfillmentMode(dto.getFulfillmentMode());
        type.setDefaultPlannedParcels(dto.getDefaultPlannedParcels());
        type.setSoftLimit(dto.getSoftLimit());
        type.setAssignDistributionNumber(Boolean.TRUE.equals(dto.getAssignDistributionNumber()));
        long count = registrationRepository.countByRegistrationTypeId(typeId);
        return toTypeDTO(typeRepository.save(type), count);
    }

    @Transactional
    public void deleteType(Long typeId) {
        DistributionRegistrationType type = typeRepository.findById(typeId)
                .orElseThrow(() -> new RuntimeException("Registration type not found: " + typeId));
        if (registrationRepository.countByRegistrationTypeId(typeId) > 0) {
            throw new RuntimeException("Cannot delete type with existing registrations");
        }
        typeRepository.delete(type);
    }

    @Transactional(readOnly = true)
    public List<DistributionRegistrationDTO> listRegistrations(Long eventId) {
        validateEvent(eventId);
        migrateLegacyRecipientsIfNeeded(eventId);
        return registrationRepository.findByDistributionEventIdOrderByRegisteredAtDesc(eventId)
                .stream().map(this::toRegistrationDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DistributionRegistrationDTO> listQueueRegistrations(Long eventId) {
        validateEvent(eventId);
        migrateLegacyRecipientsIfNeeded(eventId);
        return registrationRepository.findQueueEligible(
                        eventId, RegistrationFulfillmentMode.QUEUE, RegistrationStatus.REGISTERED)
                .stream().map(this::toRegistrationDTO).collect(Collectors.toList());
    }

    @Transactional
    public DistributionRegistrationDTO createRegistration(DistributionRegistrationCreateDTO dto) {
        DistributionEvent event = validateEvent(dto.getDistributionEventId());
        assertEventOpen(event);
        DistributionRegistrationType type = typeRepository.findById(dto.getRegistrationTypeId())
                .orElseThrow(() -> new RuntimeException("Registration type not found: " + dto.getRegistrationTypeId()));
        if (!type.getDistributionEvent().getId().equals(event.getId())) {
            throw new RuntimeException("Registration type does not belong to this event");
        }

        String displayName = dto.getDisplayName().trim();
        DistributionRegistration reg = new DistributionRegistration();
        reg.setDistributionEvent(event);
        reg.setRegistrationType(type);
        reg.setDisplayName(displayName);
        reg.setAdHoc(Boolean.TRUE.equals(dto.getAdHoc()));
        reg.setPlannedParcelCount(dto.getPlannedParcelCount() != null
                ? dto.getPlannedParcelCount() : type.getDefaultPlannedParcels());
        reg.setIdNumber(dto.getIdNumber());
        reg.setPhoneNumber(dto.getPhoneNumber());
        reg.setStatus(RegistrationStatus.REGISTERED);
        reg.setRegisteredAt(LocalDateTime.now());

        if (dto.getPersonId() != null) {
            Person person = personRepository.findById(dto.getPersonId())
                    .orElseThrow(() -> new RuntimeException("Person not found: " + dto.getPersonId()));
            registrationRepository.findByDistributionEventIdAndPersonId(event.getId(), person.getId())
                    .ifPresent(x -> {
                        throw new RuntimeException("This person is already registered for this event");
                    });
            reg.setPerson(person);
            reg.setMember(Boolean.TRUE.equals(dto.getMember()));
        } else {
            if (registrationRepository.existsByDistributionEventIdAndPersonIdIsNullAndDisplayNameIgnoreCase(
                    event.getId(), displayName)) {
                throw new RuntimeException("A registration with this name already exists for this event");
            }
            reg.setMember(false);
        }

        if (type.isAssignDistributionNumber()) {
            reg.setDistributionNumber(generateDistributionNumber(event.getId()));
        }

        return toRegistrationDTO(registrationRepository.save(reg));
    }

    @Transactional
    public DistributionRegistrationDTO updateRegistration(Long id, DistributionRegistrationUpdateDTO dto) {
        DistributionRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registration not found: " + id));
        assertEventOpen(reg.getDistributionEvent());
        if (reg.getStatus() != RegistrationStatus.REGISTERED) {
            throw new RuntimeException("Cannot edit a registration that has been collected");
        }
        if (dto.getPlannedParcelCount() != null) {
            reg.setPlannedParcelCount(dto.getPlannedParcelCount());
        }
        if (dto.getIdNumber() != null) {
            reg.setIdNumber(dto.getIdNumber());
        }
        if (dto.getPhoneNumber() != null) {
            reg.setPhoneNumber(dto.getPhoneNumber());
        }
        return toRegistrationDTO(registrationRepository.save(reg));
    }

    @Transactional
    public void deleteRegistration(Long id) {
        DistributionRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registration not found: " + id));
        assertEventOpen(reg.getDistributionEvent());
        if (reg.getStatus() != RegistrationStatus.REGISTERED) {
            throw new RuntimeException("Cannot remove a registration that has been collected");
        }
        if (!parcelDistributionRepository.findByDistributionEventIdAndRecipientTypeAndRecipientId(
                reg.getDistributionEvent().getId(), RecipientType.REGISTRATION, reg.getId()).isEmpty()) {
            throw new RuntimeException("Cannot remove registration with distribution records");
        }
        registrationRepository.delete(reg);
    }

    @Transactional
    public DistributionRegistrationDTO markCollected(Long id) {
        DistributionRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registration not found: " + id));
        reg.setStatus(RegistrationStatus.COLLECTED);
        return toRegistrationDTO(registrationRepository.save(reg));
    }

    @Transactional
    public void deleteAllForEvent(Long eventId) {
        registrationRepository.deleteByDistributionEventId(eventId);
        typeRepository.deleteByDistributionEventId(eventId);
    }

    public DistributionRegistration getRegistrationEntity(Long id) {
        return registrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Registration not found: " + id));
    }

    public void applyDistribution(DistributionRegistration reg, int parcelCount) {
        reg.setDistributedParcelCount(reg.getDistributedParcelCount() + parcelCount);
        if (reg.getDistributedParcelCount() >= reg.getPlannedParcelCount()) {
            reg.setStatus(RegistrationStatus.COLLECTED);
        }
        registrationRepository.save(reg);
    }

    public String formatRecipientLabel(DistributionRegistration reg) {
        if (reg.getDistributionNumber() != null && !reg.getDistributionNumber().isBlank()) {
            return reg.getDistributionNumber() + " — " + reg.getDisplayName();
        }
        return reg.getDisplayName();
    }

    @Transactional
    public void migrateLegacyRecipientsIfNeeded(Long eventId) {
        if (registrationRepository.countByDistributionEventId(eventId) > 0) {
            return;
        }
        List<NonMemberRecipient> legacy = nonMemberRecipientRepository
                .findByDistributionEventIdOrderByDistributionNumberAsc(eventId);
        if (legacy.isEmpty()) {
            return;
        }
        DistributionEvent event = eventRepository.findById(eventId).orElseThrow();
        DistributionRegistrationType guestType = new DistributionRegistrationType();
        guestType.setDistributionEvent(event);
        guestType.setName("Guests");
        guestType.setSortOrder(0);
        guestType.setFulfillmentMode(RegistrationFulfillmentMode.QUEUE);
        guestType.setDefaultPlannedParcels(1);
        guestType.setAssignDistributionNumber(true);
        guestType = typeRepository.save(guestType);

        for (NonMemberRecipient nm : legacy) {
            DistributionRegistration reg = new DistributionRegistration();
            reg.setDistributionEvent(event);
            reg.setRegistrationType(guestType);
            reg.setDisplayName(nm.getName());
            reg.setMember(false);
            reg.setDistributionNumber(nm.getDistributionNumber());
            reg.setPlannedParcelCount(1);
            reg.setDistributedParcelCount(nm.getStatus() == com.mosque.crm.enums.RecipientStatus.COLLECTED ? 1 : 0);
            reg.setIdNumber(nm.getIdNumber());
            reg.setPhoneNumber(nm.getPhoneNumber());
            reg.setStatus(nm.getStatus() == com.mosque.crm.enums.RecipientStatus.COLLECTED
                    ? RegistrationStatus.COLLECTED : RegistrationStatus.REGISTERED);
            reg.setRegisteredAt(nm.getRegisteredAt());
            registrationRepository.save(reg);
        }
    }

    private int nextSortOrder(Long eventId) {
        return typeRepository.findByDistributionEventIdOrderBySortOrderAscNameAsc(eventId).size();
    }

    private String generateDistributionNumber(Long eventId) {
        int maxSeq = registrationRepository.findMaxDistributionSequence(eventId);
        return String.format("R-%03d", maxSeq + 1);
    }

    private DistributionEvent validateEvent(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + eventId));
    }

    private void assertEventOpen(DistributionEvent event) {
        if (event.getStatus() == DistributionEventStatus.CLOSED) {
            throw new RuntimeException("Cannot change registrations on a closed event");
        }
    }

    private DistributionRegistrationTypeDTO toTypeDTO(DistributionRegistrationType type, long count) {
        DistributionRegistrationTypeDTO dto = new DistributionRegistrationTypeDTO();
        dto.setId(type.getId());
        dto.setDistributionEventId(type.getDistributionEvent().getId());
        dto.setName(type.getName());
        dto.setSortOrder(type.getSortOrder());
        dto.setFulfillmentMode(type.getFulfillmentMode());
        dto.setDefaultPlannedParcels(type.getDefaultPlannedParcels());
        dto.setSoftLimit(type.getSoftLimit());
        dto.setAssignDistributionNumber(type.isAssignDistributionNumber());
        dto.setRegistrationCount((int) count);
        dto.setOverSoftLimit(type.getSoftLimit() != null && count >= type.getSoftLimit());
        return dto;
    }

    private DistributionRegistrationDTO toRegistrationDTO(DistributionRegistration reg) {
        DistributionRegistrationDTO dto = new DistributionRegistrationDTO();
        dto.setId(reg.getId());
        dto.setDistributionEventId(reg.getDistributionEvent().getId());
        dto.setRegistrationTypeId(reg.getRegistrationType().getId());
        dto.setRegistrationTypeName(reg.getRegistrationType().getName());
        if (reg.getPerson() != null) {
            dto.setPersonId(reg.getPerson().getId());
        }
        dto.setDisplayName(reg.getDisplayName());
        dto.setMember(reg.isMember());
        dto.setDistributionNumber(reg.getDistributionNumber());
        dto.setPlannedParcelCount(reg.getPlannedParcelCount());
        dto.setDistributedParcelCount(reg.getDistributedParcelCount());
        dto.setIdNumber(reg.getIdNumber());
        dto.setPhoneNumber(reg.getPhoneNumber());
        dto.setAdHoc(reg.isAdHoc());
        dto.setStatus(reg.getStatus().name());
        dto.setRegisteredAt(reg.getRegisteredAt());
        dto.setCreatedAt(reg.getCreatedAt());
        dto.setUpdatedAt(reg.getUpdatedAt());
        return dto;
    }
}

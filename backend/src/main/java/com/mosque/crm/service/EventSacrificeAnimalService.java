package com.mosque.crm.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.EventSacrificeAnimalCreateDTO;
import com.mosque.crm.dto.EventSacrificeAnimalDTO;
import com.mosque.crm.dto.EventSacrificeAnimalShareCreateDTO;
import com.mosque.crm.dto.EventSacrificeAnimalShareDTO;
import com.mosque.crm.dto.EventSacrificeAnimalSummaryDTO;
import com.mosque.crm.dto.EventSacrificeAnimalUpdateDTO;
import com.mosque.crm.entity.DistributionEvent;
import com.mosque.crm.entity.EventSacrificeAnimal;
import com.mosque.crm.entity.EventSacrificeAnimalShare;
import com.mosque.crm.enums.EventKind;
import com.mosque.crm.enums.SacrificeAnimalSize;
import com.mosque.crm.exception.SacrificeShareLimitExceededException;
import com.mosque.crm.repository.DistributionEventRepository;
import com.mosque.crm.repository.DistributionRegistrationRepository;
import com.mosque.crm.repository.EventSacrificeAnimalRepository;
import com.mosque.crm.repository.EventSacrificeAnimalShareRepository;

@Service
public class EventSacrificeAnimalService {

    private final EventReferenceService eventReferenceService;
    private final EventSacrificeAnimalRepository animalRepository;
    private final EventSacrificeAnimalShareRepository shareRepository;
    private final DistributionRegistrationRepository distributionRegistrationRepository;
    private final DistributionEventRepository distributionEventRepository;

    public EventSacrificeAnimalService(
            EventReferenceService eventReferenceService,
            EventSacrificeAnimalRepository animalRepository,
            EventSacrificeAnimalShareRepository shareRepository,
            DistributionRegistrationRepository distributionRegistrationRepository,
            DistributionEventRepository distributionEventRepository) {
        this.eventReferenceService = eventReferenceService;
        this.animalRepository = animalRepository;
        this.shareRepository = shareRepository;
        this.distributionRegistrationRepository = distributionRegistrationRepository;
        this.distributionEventRepository = distributionEventRepository;
    }

    public List<EventSacrificeAnimalDTO> listAnimals(EventKind eventKind, Long eventId) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        return animalRepository.findByEventKindAndEventIdOrderByAnimalNumberAsc(eventKind, eventId)
                .stream().map(this::toAnimalDTO).collect(Collectors.toList());
    }

    public EventSacrificeAnimalSummaryDTO getSummary(EventKind eventKind, Long eventId) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        BigDecimal totalMeat = animalRepository.sumMeatKgByEvent(eventKind, eventId);
        BigDecimal totalEntitlement = shareRepository.sumMeatEntitlementKgByEvent(eventKind, eventId);
        BigDecimal totalReceivedEntitlement = shareRepository.sumReceivedMeatEntitlementKgByEvent(eventKind, eventId);
        BigDecimal available = totalMeat.subtract(totalEntitlement);

        int distributedParcels = 0;
        BigDecimal distributedWeightKg = BigDecimal.ZERO;
        if (eventKind == EventKind.DISTRIBUTION) {
            distributedParcels = distributionRegistrationRepository.sumDistributedParcelCountByEventId(eventId);
            BigDecimal kgPerParcel = distributionEventRepository.findById(eventId)
                    .map(DistributionEvent::getParcelKgPerUnit)
                    .orElse(BigDecimal.ONE);
            distributedWeightKg = kgPerParcel.multiply(BigDecimal.valueOf(distributedParcels));
        }

        EventSacrificeAnimalSummaryDTO summary = new EventSacrificeAnimalSummaryDTO();
        summary.setTotalMeatKg(totalMeat);
        summary.setTotalShareEntitlementKg(totalEntitlement);
        summary.setTotalReceivedEntitlementKg(totalReceivedEntitlement);
        summary.setAvailableMeatKg(available);
        summary.setTotalDistributedParcels(distributedParcels);
        summary.setTotalDistributedWeightKg(distributedWeightKg);
        return summary;
    }

    public EventSacrificeAnimalDTO getAnimal(Long id) {
        EventSacrificeAnimal animal = animalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sacrifice animal not found: " + id));
        return toAnimalDTO(animal);
    }

    @Transactional
    public EventSacrificeAnimalDTO createAnimal(EventKind eventKind, Long eventId, EventSacrificeAnimalCreateDTO dto) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        String number = dto.getAnimalNumber().trim();
        if (animalRepository.findByEventKindAndEventIdAndAnimalNumber(eventKind, eventId, number).isPresent()) {
            throw new RuntimeException("Animal number already exists: " + number);
        }
        EventSacrificeAnimal animal = new EventSacrificeAnimal();
        animal.setEventKind(eventKind);
        animal.setEventId(eventId);
        animal.setAnimalNumber(number);
        animal.setSize(dto.getSize());
        return toAnimalDTO(animalRepository.save(animal));
    }

    @Transactional
    public EventSacrificeAnimalDTO updateAnimal(Long id, EventSacrificeAnimalUpdateDTO dto) {
        EventSacrificeAnimal animal = animalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sacrifice animal not found: " + id));
        String number = dto.getAnimalNumber().trim();
        SacrificeAnimalSize newSize = dto.getSize();
        if (!number.equals(animal.getAnimalNumber())) {
            if (animalRepository.findByEventKindAndEventIdAndAnimalNumber(
                    animal.getEventKind(), animal.getEventId(), number).isPresent()) {
                throw new RuntimeException("Animal number already exists: " + number);
            }
            animal.setAnimalNumber(number);
        }
        if (newSize != animal.getSize()) {
            int allocated = shareRepository.sumShareCountByAnimalId(id);
            if (allocated > newSize.getMaxShares()) {
                throw new SacrificeShareLimitExceededException(
                        "Cannot change size: " + allocated + " shares already allocated, max for "
                                + newSize + " is " + newSize.getMaxShares());
            }
            animal.setSize(newSize);
        }
        animal.setWeightKg(dto.getWeightKg());
        animal.setMeatKg(dto.getMeatKg());
        return toAnimalDTO(animalRepository.save(animal));
    }

    @Transactional
    public void deleteAnimal(Long id) {
        shareRepository.deleteByAnimalId(id);
        animalRepository.deleteById(id);
    }

    public List<EventSacrificeAnimalShareDTO> listShares(Long animalId) {
        getAnimalEntity(animalId);
        return shareRepository.findByAnimalIdOrderByPersonNameAsc(animalId)
                .stream().map(this::toShareDTO).collect(Collectors.toList());
    }

    @Transactional
    public EventSacrificeAnimalShareDTO addShare(Long animalId, EventSacrificeAnimalShareCreateDTO dto) {
        EventSacrificeAnimal animal = getAnimalEntity(animalId);
        validateShareAllocation(animal, dto.getShareCount(), null);
        EventSacrificeAnimalShare share = new EventSacrificeAnimalShare();
        share.setAnimal(animal);
        share.setPersonId(dto.getPersonId());
        share.setPersonName(dto.getPersonName().trim());
        share.setMember(Boolean.TRUE.equals(dto.getMember()));
        share.setShareCount(dto.getShareCount());
        share.setMeatEntitlementKg(dto.getMeatEntitlementKg());
        return toShareDTO(shareRepository.save(share));
    }

    @Transactional
    public EventSacrificeAnimalShareDTO updateShare(Long animalId, Long shareId, EventSacrificeAnimalShareCreateDTO dto) {
        EventSacrificeAnimal animal = getAnimalEntity(animalId);
        EventSacrificeAnimalShare share = shareRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share not found: " + shareId));
        if (!share.getAnimal().getId().equals(animalId)) {
            throw new RuntimeException("Share does not belong to this animal");
        }
        validateShareAllocation(animal, dto.getShareCount(), shareId);
        share.setPersonId(dto.getPersonId());
        share.setPersonName(dto.getPersonName().trim());
        share.setMember(Boolean.TRUE.equals(dto.getMember()));
        share.setShareCount(dto.getShareCount());
        share.setMeatEntitlementKg(dto.getMeatEntitlementKg());
        return toShareDTO(shareRepository.save(share));
    }

    @Transactional
    public EventSacrificeAnimalShareDTO markEntitlementReceived(Long animalId, Long shareId) {
        EventSacrificeAnimalShare share = shareRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share not found: " + shareId));
        if (!share.getAnimal().getId().equals(animalId)) {
            throw new RuntimeException("Share does not belong to this animal");
        }
        if (share.isEntitlementReceived()) {
            return toShareDTO(share);
        }
        share.setEntitlementReceived(true);
        share.setEntitlementReceivedAt(LocalDateTime.now());
        return toShareDTO(shareRepository.save(share));
    }

    @Transactional
    public void deleteShare(Long animalId, Long shareId) {
        EventSacrificeAnimalShare share = shareRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share not found: " + shareId));
        if (!share.getAnimal().getId().equals(animalId)) {
            throw new RuntimeException("Share does not belong to this animal");
        }
        shareRepository.delete(share);
    }

    @Transactional
    public void deleteAllForEvent(EventKind eventKind, Long eventId) {
        List<EventSacrificeAnimal> animals = animalRepository.findByEventKindAndEventIdOrderByAnimalNumberAsc(eventKind, eventId);
        for (EventSacrificeAnimal animal : animals) {
            shareRepository.deleteByAnimalId(animal.getId());
        }
        animalRepository.deleteByEventKindAndEventId(eventKind, eventId);
    }

    private EventSacrificeAnimal getAnimalEntity(Long animalId) {
        return animalRepository.findById(animalId)
                .orElseThrow(() -> new RuntimeException("Sacrifice animal not found: " + animalId));
    }

    private void validateShareAllocation(EventSacrificeAnimal animal, int newShareCount, Long excludeShareId) {
        int current = excludeShareId == null
                ? shareRepository.sumShareCountByAnimalId(animal.getId())
                : shareRepository.sumShareCountByAnimalIdExcluding(animal.getId(), excludeShareId);
        int max = animal.getMaxShares();
        if (current + newShareCount > max) {
            throw new SacrificeShareLimitExceededException(
                    "Share limit exceeded: " + (current + newShareCount) + " of " + max + " shares");
        }
    }

    private EventSacrificeAnimalDTO toAnimalDTO(EventSacrificeAnimal animal) {
        int allocated = shareRepository.sumShareCountByAnimalId(animal.getId());
        int max = animal.getMaxShares();
        EventSacrificeAnimalDTO dto = new EventSacrificeAnimalDTO();
        dto.setId(animal.getId());
        dto.setEventKind(animal.getEventKind().name());
        dto.setEventId(animal.getEventId());
        dto.setAnimalNumber(animal.getAnimalNumber());
        dto.setSize(animal.getSize());
        dto.setMaxShares(max);
        dto.setAllocatedShares(allocated);
        dto.setRemainingShares(max - allocated);
        dto.setWeightKg(animal.getWeightKg());
        dto.setMeatKg(animal.getMeatKg());
        dto.setTotalMeatEntitlementKg(shareRepository.sumMeatEntitlementKgByAnimalId(animal.getId()));
        dto.setShares(shareRepository.findByAnimalIdOrderByPersonNameAsc(animal.getId())
                .stream().map(this::toShareDTO).collect(Collectors.toList()));
        return dto;
    }

    private EventSacrificeAnimalShareDTO toShareDTO(EventSacrificeAnimalShare share) {
        EventSacrificeAnimalShareDTO dto = new EventSacrificeAnimalShareDTO();
        dto.setId(share.getId());
        dto.setAnimalId(share.getAnimal().getId());
        dto.setPersonId(share.getPersonId());
        dto.setPersonName(share.getPersonName());
        dto.setMember(share.isMember());
        dto.setShareCount(share.getShareCount());
        dto.setMeatEntitlementKg(share.getMeatEntitlementKg());
        dto.setEntitlementReceived(share.isEntitlementReceived());
        dto.setEntitlementReceivedAt(share.getEntitlementReceivedAt());
        return dto;
    }
}

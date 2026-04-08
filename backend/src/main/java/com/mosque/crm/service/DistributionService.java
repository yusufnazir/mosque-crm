package com.mosque.crm.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.DistributionEventCreateDTO;
import com.mosque.crm.dto.DistributionEventDTO;
import com.mosque.crm.dto.DistributionSummaryDTO;
import com.mosque.crm.dto.MemberRegistrationCreateDTO;
import com.mosque.crm.dto.MemberRegistrationDTO;
import com.mosque.crm.dto.NonMemberRecipientCreateDTO;
import com.mosque.crm.dto.NonMemberRecipientDTO;
import com.mosque.crm.dto.ParcelCategoryCreateDTO;
import com.mosque.crm.dto.ParcelCategoryDTO;
import com.mosque.crm.dto.ParcelDistributionCreateDTO;
import com.mosque.crm.dto.ParcelDistributionDTO;
import com.mosque.crm.entity.DistributionEvent;
import com.mosque.crm.entity.MemberDistributionRegistration;
import com.mosque.crm.entity.NonMemberRecipient;
import com.mosque.crm.entity.ParcelCategory;
import com.mosque.crm.entity.ParcelDistribution;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.DistributionEventStatus;
import com.mosque.crm.enums.OrganizationEventType;
import com.mosque.crm.enums.RecipientStatus;
import com.mosque.crm.enums.RecipientType;
import com.mosque.crm.enums.RegistrationStatus;
import com.mosque.crm.repository.DistributionEventRepository;
import com.mosque.crm.repository.MemberDistributionRegistrationRepository;
import com.mosque.crm.repository.NonMemberRecipientRepository;
import com.mosque.crm.repository.ParcelCategoryRepository;
import com.mosque.crm.repository.ParcelDistributionRepository;
import com.mosque.crm.repository.PersonRepository;

@Service
public class DistributionService {

    private static final Logger log = LoggerFactory.getLogger(DistributionService.class);

    private final DistributionEventRepository distributionEventRepository;
    private final ParcelCategoryRepository parcelCategoryRepository;
    private final NonMemberRecipientRepository nonMemberRecipientRepository;
    private final MemberDistributionRegistrationRepository memberRegistrationRepository;
    private final ParcelDistributionRepository parcelDistributionRepository;
    private final PersonRepository personRepository;

    public DistributionService(
            DistributionEventRepository distributionEventRepository,
            ParcelCategoryRepository parcelCategoryRepository,
            NonMemberRecipientRepository nonMemberRecipientRepository,
            MemberDistributionRegistrationRepository memberRegistrationRepository,
            ParcelDistributionRepository parcelDistributionRepository,
            PersonRepository personRepository) {
        this.distributionEventRepository = distributionEventRepository;
        this.parcelCategoryRepository = parcelCategoryRepository;
        this.nonMemberRecipientRepository = nonMemberRecipientRepository;
        this.memberRegistrationRepository = memberRegistrationRepository;
        this.parcelDistributionRepository = parcelDistributionRepository;
        this.personRepository = personRepository;
    }

    // ========================
    // Distribution Events
    // ========================

    @Transactional
    public DistributionEventDTO createEvent(DistributionEventCreateDTO dto) {
        DistributionEvent event = new DistributionEvent();
        event.setYear(dto.getYear());
        event.setName(dto.getName());
        event.setEventDate(dto.getEventDate());
        event.setLocation(dto.getLocation());
        event.setStatus(DistributionEventStatus.PLANNED);
        if (dto.getEventType() != null) {
            event.setEventType(OrganizationEventType.valueOf(dto.getEventType()));
        }
        if (dto.getMemberCapacity() != null) {
            event.setMemberCapacity(dto.getMemberCapacity());
        }
        if (dto.getNonMemberCapacity() != null) {
            event.setNonMemberCapacity(dto.getNonMemberCapacity());
        }
        event = distributionEventRepository.save(event);
        log.info("Created distribution event: {} (id={})", event.getName(), event.getId());
        return convertToEventDTO(event);
    }

    @Transactional
    public DistributionEventDTO updateEvent(Long id, DistributionEventCreateDTO dto) {
        DistributionEvent event = distributionEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + id));
        event.setYear(dto.getYear());
        event.setName(dto.getName());
        event.setEventDate(dto.getEventDate());
        event.setLocation(dto.getLocation());
        if (dto.getMemberCapacity() != null) {
            event.setMemberCapacity(dto.getMemberCapacity());
        }
        if (dto.getNonMemberCapacity() != null) {
            event.setNonMemberCapacity(dto.getNonMemberCapacity());
        }
        event = distributionEventRepository.save(event);
        log.info("Updated distribution event: {} (id={})", event.getName(), event.getId());
        return convertToEventDTO(event);
    }

    @Transactional
    public DistributionEventDTO updateEventStatus(Long id, String status) {
        DistributionEvent event = distributionEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + id));
        event.setStatus(DistributionEventStatus.valueOf(status));
        event = distributionEventRepository.save(event);
        log.info("Updated distribution event status: {} -> {} (id={})", event.getName(), status, event.getId());
        return convertToEventDTO(event);
    }

    @Transactional
    public void deleteEvent(Long id) {
        DistributionEvent event = distributionEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + id));
        parcelDistributionRepository.deleteByDistributionEventId(id);
        memberRegistrationRepository.deleteByDistributionEventId(id);
        nonMemberRecipientRepository.deleteByDistributionEventId(id);
        parcelCategoryRepository.deleteByDistributionEventId(id);
        distributionEventRepository.delete(event);
        log.info("Deleted distribution event: {} (id={})", event.getName(), id);
    }

    @Transactional(readOnly = true)
    public DistributionEventDTO getEvent(Long id) {
        DistributionEvent event = distributionEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + id));
        DistributionEventDTO dto = convertToEventDTO(event);
        List<ParcelCategory> categories = parcelCategoryRepository.findByDistributionEventIdOrderByNameAsc(id);
        dto.setParcelCategories(categories.stream().map(this::convertToCategoryDTO).collect(Collectors.toList()));
        return dto;
    }

    @Transactional(readOnly = true)
    public List<DistributionEventDTO> listEvents() {
        return distributionEventRepository.findAllByOrderByYearDescCreatedAtDesc()
                .stream()
                .map(this::convertToEventDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DistributionSummaryDTO getEventSummary(Long eventId) {
        distributionEventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + eventId));

        List<ParcelCategory> categories = parcelCategoryRepository.findByDistributionEventIdOrderByNameAsc(eventId);
        int totalParcels = categories.stream().mapToInt(ParcelCategory::getTotalParcels).sum();
        int distributedParcels = categories.stream().mapToInt(ParcelCategory::getDistributedParcels).sum();

        long totalMembers = memberRegistrationRepository.countByDistributionEventId(eventId);
        long totalNonMembers = nonMemberRecipientRepository.countByDistributionEventId(eventId);

        List<MemberDistributionRegistration> memberRegs = memberRegistrationRepository
                .findByDistributionEventIdOrderByRegisteredAtDesc(eventId);
        long collectedMembers = memberRegs.stream()
                .filter(r -> r.getStatus() == RegistrationStatus.COLLECTED).count();

        List<NonMemberRecipient> nonMemberRegs = nonMemberRecipientRepository
                .findByDistributionEventIdOrderByDistributionNumberAsc(eventId);
        long collectedNonMembers = nonMemberRegs.stream()
                .filter(r -> r.getStatus() == RecipientStatus.COLLECTED).count();

        DistributionSummaryDTO summary = new DistributionSummaryDTO();
        summary.setTotalParcels(totalParcels);
        summary.setDistributedParcels(distributedParcels);
        summary.setRemainingParcels(totalParcels - distributedParcels);
        summary.setTotalMembers((int) totalMembers);
        summary.setTotalNonMembers((int) totalNonMembers);
        summary.setCollectedMembers((int) collectedMembers);
        summary.setCollectedNonMembers((int) collectedNonMembers);
        summary.setNonMemberAllocation(categories.stream().mapToInt(ParcelCategory::getNonMemberAllocation).sum());
        return summary;
    }

    // ========================
    // Parcel Categories
    // ========================

    @Transactional
    public ParcelCategoryDTO createCategory(ParcelCategoryCreateDTO dto) {
        DistributionEvent event = distributionEventRepository.findById(dto.getDistributionEventId())
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + dto.getDistributionEventId()));

        ParcelCategory category = new ParcelCategory();
        category.setDistributionEvent(event);
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setTotalParcels(dto.getTotalParcels());
        category.setNonMemberAllocation(dto.getNonMemberAllocation() != null ? dto.getNonMemberAllocation() : 0);
        category.setDistributedParcels(0);
        category = parcelCategoryRepository.save(category);
        log.info("Created parcel category: {} (id={}) for event {}", category.getName(), category.getId(), event.getId());
        return convertToCategoryDTO(category);
    }

    @Transactional
    public ParcelCategoryDTO updateCategory(Long id, ParcelCategoryCreateDTO dto) {
        ParcelCategory category = parcelCategoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parcel category not found: " + id));
        category.setName(dto.getName());
        category.setDescription(dto.getDescription());
        category.setTotalParcels(dto.getTotalParcels());
        if (dto.getNonMemberAllocation() != null) {
            category.setNonMemberAllocation(dto.getNonMemberAllocation());
        }
        category = parcelCategoryRepository.save(category);
        log.info("Updated parcel category: {} (id={})", category.getName(), category.getId());
        return convertToCategoryDTO(category);
    }

    @Transactional(readOnly = true)
    public ParcelCategoryDTO getCategory(Long id) {
        ParcelCategory category = parcelCategoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parcel category not found: " + id));
        return convertToCategoryDTO(category);
    }

    @Transactional(readOnly = true)
    public List<ParcelCategoryDTO> listCategoriesByEvent(Long eventId) {
        return parcelCategoryRepository.findByDistributionEventIdOrderByNameAsc(eventId)
                .stream()
                .map(this::convertToCategoryDTO)
                .collect(Collectors.toList());
    }

    // ========================
    // Non-Member Recipients
    // ========================

    @Transactional
    public NonMemberRecipientDTO createNonMember(NonMemberRecipientCreateDTO dto) {
        DistributionEvent event = distributionEventRepository.findById(dto.getDistributionEventId())
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + dto.getDistributionEventId()));

        String distributionNumber = generateDistributionNumber(event.getId());

        // Non-member registration requires non-member allocation to be configured
        int nonMemberAllocation = parcelCategoryRepository.findByDistributionEventIdOrderByNameAsc(event.getId())
                .stream().mapToInt(ParcelCategory::getNonMemberAllocation).sum();
        if (nonMemberAllocation <= 0) {
            throw new RuntimeException("Configure non-member parcel allocation before registering non-members");
        }

        NonMemberRecipient recipient = new NonMemberRecipient();
        recipient.setDistributionEvent(event);
        recipient.setDistributionNumber(distributionNumber);
        recipient.setName(dto.getName());
        recipient.setIdNumber(dto.getIdNumber());
        recipient.setPhoneNumber(dto.getPhoneNumber());
        recipient.setStatus(RecipientStatus.REGISTERED);
        recipient.setRegisteredAt(LocalDateTime.now());
        recipient = nonMemberRecipientRepository.save(recipient);
        log.info("Created non-member recipient: {} number={} (id={})", recipient.getName(), distributionNumber, recipient.getId());
        return convertToNonMemberDTO(recipient);
    }

    @Transactional(readOnly = true)
    public NonMemberRecipientDTO getNonMember(Long id) {
        NonMemberRecipient recipient = nonMemberRecipientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Non-member recipient not found: " + id));
        return convertToNonMemberDTO(recipient);
    }

    @Transactional(readOnly = true)
    public List<NonMemberRecipientDTO> listNonMembersByEvent(Long eventId) {
        return nonMemberRecipientRepository.findByDistributionEventIdOrderByDistributionNumberAsc(eventId)
                .stream()
                .map(this::convertToNonMemberDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public NonMemberRecipientDTO findNonMemberByNumber(Long eventId, String distributionNumber) {
        NonMemberRecipient recipient = nonMemberRecipientRepository
                .findByDistributionEventIdAndDistributionNumber(eventId, distributionNumber)
                .orElseThrow(() -> new RuntimeException("Non-member not found with number: " + distributionNumber));
        return convertToNonMemberDTO(recipient);
    }

    // ========================
    // Member Registrations
    // ========================

    @Transactional
    public MemberRegistrationDTO createMemberRegistration(MemberRegistrationCreateDTO dto) {
        DistributionEvent event = distributionEventRepository.findById(dto.getDistributionEventId())
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + dto.getDistributionEventId()));

        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found: " + dto.getPersonId()));

        memberRegistrationRepository.findByDistributionEventIdAndPersonId(event.getId(), person.getId())
                .ifPresent(existing -> {
                    throw new RuntimeException("Person is already registered for this event");
                });

        MemberDistributionRegistration reg = new MemberDistributionRegistration();
        reg.setDistributionEvent(event);
        reg.setPerson(person);
        reg.setStatus(RegistrationStatus.REGISTERED);
        reg.setRegisteredAt(LocalDateTime.now());
        reg = memberRegistrationRepository.save(reg);
        log.info("Registered member {} for event {} (id={})", person.getId(), event.getId(), reg.getId());
        return convertToMemberRegDTO(reg);
    }

    @Transactional(readOnly = true)
    public MemberRegistrationDTO getMemberRegistration(Long id) {
        MemberDistributionRegistration reg = memberRegistrationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member registration not found: " + id));
        return convertToMemberRegDTO(reg);
    }

    @Transactional(readOnly = true)
    public List<MemberRegistrationDTO> listMemberRegistrationsByEvent(Long eventId) {
        return memberRegistrationRepository.findByDistributionEventIdOrderByRegisteredAtDesc(eventId)
                .stream()
                .map(this::convertToMemberRegDTO)
                .collect(Collectors.toList());
    }

    // ========================
    // Parcel Distribution
    // ========================

    @Transactional
    public ParcelDistributionDTO distribute(ParcelDistributionCreateDTO dto) {
        DistributionEvent event = distributionEventRepository.findById(dto.getDistributionEventId())
                .orElseThrow(() -> new RuntimeException("Distribution event not found: " + dto.getDistributionEventId()));

        if (event.getStatus() == DistributionEventStatus.CLOSED) {
            throw new RuntimeException("Distribution event is closed");
        }

        ParcelCategory category = parcelCategoryRepository.findById(dto.getParcelCategoryId())
                .orElseThrow(() -> new RuntimeException("Parcel category not found: " + dto.getParcelCategoryId()));

        RecipientType recipientType = RecipientType.valueOf(dto.getRecipientType());
        int parcelCount = dto.getParcelCount();

        // Business rule: prevent over-distribution
        if (parcelCount > category.getRemainingParcels()) {
            throw new RuntimeException("Not enough parcels available. Remaining: " + category.getRemainingParcels());
        }

        String recipientName;
        if (recipientType == RecipientType.MEMBER) {
            MemberDistributionRegistration reg = memberRegistrationRepository.findById(dto.getRecipientId())
                    .orElseThrow(() -> new RuntimeException("Member registration not found: " + dto.getRecipientId()));

            if (reg.getStatus() != RegistrationStatus.REGISTERED) {
                throw new RuntimeException("Member has already collected parcels");
            }

            // Mark as collected
            reg.setStatus(RegistrationStatus.COLLECTED);
            memberRegistrationRepository.save(reg);

            Person person = reg.getPerson();
            recipientName = person.getFirstName() + " " + person.getLastName();
        } else {
            NonMemberRecipient recipient = nonMemberRecipientRepository.findById(dto.getRecipientId())
                    .orElseThrow(() -> new RuntimeException("Non-member recipient not found: " + dto.getRecipientId()));

            if (recipient.getStatus() == RecipientStatus.COLLECTED) {
                throw new RuntimeException("Non-member already collected parcels");
            }

            // Mark as collected
            recipient.setStatus(RecipientStatus.COLLECTED);
            nonMemberRecipientRepository.save(recipient);

            recipientName = recipient.getDistributionNumber() + " — " + recipient.getName();
        }

        // Update distributed count
        category.setDistributedParcels(category.getDistributedParcels() + parcelCount);
        parcelCategoryRepository.save(category);

        // Create distribution record
        ParcelDistribution dist = new ParcelDistribution();
        dist.setDistributionEvent(event);
        dist.setRecipientType(recipientType);
        dist.setRecipientId(dto.getRecipientId());
        dist.setParcelCategory(category);
        dist.setParcelCount(parcelCount);
        dist.setDistributedBy(dto.getDistributedBy());
        dist.setDistributedAt(LocalDateTime.now());
        dist = parcelDistributionRepository.save(dist);

        log.info("Distributed {} parcels of {} to {} {} (id={})",
                parcelCount, category.getName(), recipientType, recipientName, dist.getId());

        ParcelDistributionDTO result = convertToDistributionDTO(dist);
        result.setRecipientName(recipientName);
        result.setParcelCategoryName(category.getName());
        return result;
    }

    @Transactional(readOnly = true)
    public List<ParcelDistributionDTO> listDistributionsByEvent(Long eventId) {
        List<ParcelDistribution> dists = parcelDistributionRepository.findByDistributionEventIdOrderByDistributedAtDesc(eventId);

        // Batch-load recipient names to avoid N+1 queries
        Map<Long, NonMemberRecipient> nonMemberMap = nonMemberRecipientRepository
                .findByDistributionEventIdOrderByDistributionNumberAsc(eventId)
                .stream()
                .collect(Collectors.toMap(NonMemberRecipient::getId, r -> r));

        Map<Long, MemberDistributionRegistration> memberMap = memberRegistrationRepository
                .findByDistributionEventIdOrderByRegisteredAtDesc(eventId)
                .stream()
                .collect(Collectors.toMap(MemberDistributionRegistration::getId, r -> r));

        return dists.stream().map(dist -> {
            ParcelDistributionDTO dto = convertToDistributionDTO(dist);
            if (dist.getRecipientType() == RecipientType.NON_MEMBER) {
                NonMemberRecipient nm = nonMemberMap.get(dist.getRecipientId());
                if (nm != null) {
                    dto.setRecipientName(nm.getDistributionNumber() + " — " + nm.getName());
                }
            } else {
                MemberDistributionRegistration mr = memberMap.get(dist.getRecipientId());
                if (mr != null) {
                    Person person = mr.getPerson();
                    dto.setRecipientName(person.getFirstName() + " " + person.getLastName());
                }
            }
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ParcelDistributionDTO getDistribution(Long id) {
        ParcelDistribution dist = parcelDistributionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Parcel distribution not found: " + id));
        return convertToDistributionDTO(dist);
    }

    // ========================
    // Helpers
    // ========================

    private String generateDistributionNumber(Long eventId) {
        long count = nonMemberRecipientRepository.countByDistributionEventId(eventId);
        return String.format("N-%03d", count + 1);
    }

    private DistributionEventDTO convertToEventDTO(DistributionEvent event) {
        DistributionEventDTO dto = new DistributionEventDTO();
        dto.setId(event.getId());
        dto.setYear(event.getYear());
        dto.setName(event.getName());
        dto.setEventDate(event.getEventDate());
        dto.setLocation(event.getLocation());
        dto.setStatus(event.getStatus().name());
        dto.setEventType(event.getEventType().name());
        dto.setMemberCapacity(event.getMemberCapacity());
        dto.setNonMemberCapacity(event.getNonMemberCapacity());
        dto.setCreatedAt(event.getCreatedAt());
        dto.setUpdatedAt(event.getUpdatedAt());
        return dto;
    }

    private ParcelCategoryDTO convertToCategoryDTO(ParcelCategory category) {
        ParcelCategoryDTO dto = new ParcelCategoryDTO();
        dto.setId(category.getId());
        dto.setDistributionEventId(category.getDistributionEvent().getId());
        dto.setName(category.getName());
        dto.setDescription(category.getDescription());
        dto.setTotalParcels(category.getTotalParcels());
        dto.setDistributedParcels(category.getDistributedParcels());
        dto.setRemainingParcels(category.getRemainingParcels());
        dto.setNonMemberAllocation(category.getNonMemberAllocation());
        dto.setCreatedAt(category.getCreatedAt());
        dto.setUpdatedAt(category.getUpdatedAt());
        return dto;
    }

    private NonMemberRecipientDTO convertToNonMemberDTO(NonMemberRecipient recipient) {
        NonMemberRecipientDTO dto = new NonMemberRecipientDTO();
        dto.setId(recipient.getId());
        dto.setDistributionEventId(recipient.getDistributionEvent().getId());
        dto.setDistributionNumber(recipient.getDistributionNumber());
        dto.setName(recipient.getName());
        dto.setIdNumber(recipient.getIdNumber());
        dto.setPhoneNumber(recipient.getPhoneNumber());
        dto.setStatus(recipient.getStatus().name());
        dto.setRegisteredAt(recipient.getRegisteredAt());
        dto.setCreatedAt(recipient.getCreatedAt());
        dto.setUpdatedAt(recipient.getUpdatedAt());
        return dto;
    }

    private MemberRegistrationDTO convertToMemberRegDTO(MemberDistributionRegistration reg) {
        MemberRegistrationDTO dto = new MemberRegistrationDTO();
        dto.setId(reg.getId());
        dto.setDistributionEventId(reg.getDistributionEvent().getId());
        dto.setPersonId(reg.getPerson().getId());
        dto.setPersonName(reg.getPerson().getFirstName() + " " + reg.getPerson().getLastName());
        dto.setStatus(reg.getStatus().name());
        dto.setRegisteredAt(reg.getRegisteredAt());
        dto.setCreatedAt(reg.getCreatedAt());
        dto.setUpdatedAt(reg.getUpdatedAt());
        return dto;
    }

    private ParcelDistributionDTO convertToDistributionDTO(ParcelDistribution dist) {
        ParcelDistributionDTO dto = new ParcelDistributionDTO();
        dto.setId(dist.getId());
        dto.setDistributionEventId(dist.getDistributionEvent().getId());
        dto.setRecipientType(dist.getRecipientType().name());
        dto.setRecipientId(dist.getRecipientId());
        dto.setParcelCategoryId(dist.getParcelCategory().getId());
        dto.setParcelCategoryName(dist.getParcelCategory().getName());
        dto.setParcelCount(dist.getParcelCount());
        dto.setDistributedBy(dist.getDistributedBy());
        dto.setDistributedAt(dist.getDistributedAt());
        dto.setCreatedAt(dist.getCreatedAt());
        dto.setUpdatedAt(dist.getUpdatedAt());
        return dto;
    }
}

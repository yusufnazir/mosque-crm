package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.MemberContributionExemptionCreateDTO;
import com.mosque.crm.dto.MemberContributionExemptionDTO;
import com.mosque.crm.entity.ContributionType;
import com.mosque.crm.entity.MemberContributionExemption;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.ExemptionType;
import com.mosque.crm.repository.ContributionTypeRepository;
import com.mosque.crm.repository.MemberContributionExemptionRepository;
import com.mosque.crm.repository.PersonRepository;

/**
 * Service for managing member contribution exemptions.
 *
 * Exemptions allow defining per-member discounts or full exemptions
 * for specific contribution types.
 */
@Service
public class MemberContributionExemptionService {

    private static final Logger log = LoggerFactory.getLogger(MemberContributionExemptionService.class);

    private final MemberContributionExemptionRepository exemptionRepository;
    private final PersonRepository personRepository;
    private final ContributionTypeRepository contributionTypeRepository;

    public MemberContributionExemptionService(MemberContributionExemptionRepository exemptionRepository,
                                               PersonRepository personRepository,
                                               ContributionTypeRepository contributionTypeRepository) {
        this.exemptionRepository = exemptionRepository;
        this.personRepository = personRepository;
        this.contributionTypeRepository = contributionTypeRepository;
    }

    @Transactional(readOnly = true)
    public List<MemberContributionExemptionDTO> getAllExemptions() {
        return exemptionRepository.findAllWithDetails().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MemberContributionExemptionDTO getExemptionById(Long id) {
        MemberContributionExemption exemption = exemptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exemption not found with id: " + id));
        return convertToDTO(exemption);
    }

    @Transactional(readOnly = true)
    public List<MemberContributionExemptionDTO> getActiveExemptions(Long personId, Long contributionTypeId) {
        return exemptionRepository.findActiveExemptions(personId, contributionTypeId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public MemberContributionExemptionDTO createExemption(MemberContributionExemptionCreateDTO createDTO) {
        Person person = personRepository.findById(createDTO.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + createDTO.getPersonId()));

        ContributionType type = contributionTypeRepository.findById(createDTO.getContributionTypeId())
                .orElseThrow(() -> new RuntimeException("Contribution type not found with id: " + createDTO.getContributionTypeId()));

        ExemptionType exemptionType = ExemptionType.valueOf(createDTO.getExemptionType().toUpperCase());

        MemberContributionExemption exemption = new MemberContributionExemption();
        exemption.setPerson(person);
        exemption.setContributionType(type);
        exemption.setExemptionType(exemptionType);
        exemption.setAmount(createDTO.getAmount());
        exemption.setReason(createDTO.getReason());
        exemption.setStartDate(createDTO.getStartDate());
        exemption.setEndDate(createDTO.getEndDate());
        exemption.setIsActive(createDTO.getIsActive() != null ? createDTO.getIsActive() : true);

        exemption = exemptionRepository.save(exemption);
        log.info("Created exemption for person {} on type {} (type={}, amount={})",
                person.getFirstName(), type.getCode(), exemptionType, createDTO.getAmount());
        return convertToDTO(exemption);
    }

    @Transactional
    public MemberContributionExemptionDTO updateExemption(Long id, MemberContributionExemptionCreateDTO updateDTO) {
        MemberContributionExemption exemption = exemptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exemption not found with id: " + id));

        ExemptionType exemptionType = ExemptionType.valueOf(updateDTO.getExemptionType().toUpperCase());

        exemption.setExemptionType(exemptionType);
        exemption.setAmount(updateDTO.getAmount());
        exemption.setReason(updateDTO.getReason());
        exemption.setStartDate(updateDTO.getStartDate());
        exemption.setEndDate(updateDTO.getEndDate());
        if (updateDTO.getIsActive() != null) {
            exemption.setIsActive(updateDTO.getIsActive());
        }

        exemption = exemptionRepository.save(exemption);
        log.info("Updated exemption id={} (type={}, amount={})",
                exemption.getId(), exemptionType, updateDTO.getAmount());
        return convertToDTO(exemption);
    }

    @Transactional
    public void deleteExemption(Long id) {
        MemberContributionExemption exemption = exemptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exemption not found with id: " + id));
        exemptionRepository.delete(exemption);
        log.info("Deleted exemption id={}", id);
    }

    private MemberContributionExemptionDTO convertToDTO(MemberContributionExemption exemption) {
        MemberContributionExemptionDTO dto = new MemberContributionExemptionDTO();
        dto.setId(exemption.getId());
        dto.setPersonId(exemption.getPerson().getId());
        String personName = exemption.getPerson().getFirstName();
        if (exemption.getPerson().getLastName() != null) {
            personName += " " + exemption.getPerson().getLastName();
        }
        dto.setPersonName(personName);
        dto.setContributionTypeId(exemption.getContributionType().getId());
        dto.setContributionTypeCode(exemption.getContributionType().getCode());
        dto.setExemptionType(exemption.getExemptionType().name());
        dto.setAmount(exemption.getAmount());
        dto.setReason(exemption.getReason());
        dto.setStartDate(exemption.getStartDate());
        dto.setEndDate(exemption.getEndDate());
        dto.setIsActive(exemption.getIsActive());
        return dto;
    }
}

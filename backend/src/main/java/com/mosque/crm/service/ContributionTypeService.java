package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.ContributionObligationDTO;
import com.mosque.crm.dto.ContributionTypeCreateDTO;
import com.mosque.crm.dto.ContributionTypeDTO;
import com.mosque.crm.dto.ContributionTypeTranslationDTO;
import com.mosque.crm.entity.ContributionObligation;
import com.mosque.crm.entity.ContributionType;
import com.mosque.crm.entity.ContributionTypeTranslation;
import com.mosque.crm.repository.ContributionTypeRepository;

/**
 * Service for managing ContributionTypes and their translations.
 *
 * Business rules:
 * - Code must be unique within the mosque
 * - Optional types cannot have obligations
 * - Deactivated types prevent new payments (enforced in MemberPaymentService)
 * - Translations use locale fallback: requested locale -> "en" -> null
 */
@Service
public class ContributionTypeService {

    private static final Logger log = LoggerFactory.getLogger(ContributionTypeService.class);

    private final ContributionTypeRepository contributionTypeRepository;

    public ContributionTypeService(ContributionTypeRepository contributionTypeRepository) {
        this.contributionTypeRepository = contributionTypeRepository;
    }

    /**
     * Get all contribution types with translations and obligations.
     */
    @Transactional(readOnly = true)
    public List<ContributionTypeDTO> getAllTypes() {
        return contributionTypeRepository.findAllWithTranslationsAndObligations().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get only active contribution types.
     */
    @Transactional(readOnly = true)
    public List<ContributionTypeDTO> getActiveTypes() {
        return contributionTypeRepository.findAllActiveWithTranslations().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a single contribution type by ID.
     */
    @Transactional(readOnly = true)
    public ContributionTypeDTO getTypeById(Long id) {
        ContributionType type = contributionTypeRepository.findByIdWithTranslationsAndObligations(id)
                .orElseThrow(() -> new RuntimeException("Contribution type not found with id: " + id));
        return convertToDTO(type);
    }

    /**
     * Create a new contribution type with optional translations.
     */
    @Transactional
    public ContributionTypeDTO createType(ContributionTypeCreateDTO createDTO) {
        if (contributionTypeRepository.existsByCode(createDTO.getCode())) {
            throw new RuntimeException("Contribution type with code '" + createDTO.getCode() + "' already exists");
        }

        ContributionType type = new ContributionType();
        type.setCode(createDTO.getCode());
        type.setIsRequired(createDTO.getIsRequired());
        type.setIsActive(createDTO.getIsActive() != null ? createDTO.getIsActive() : true);

        // Add translations if provided
        if (createDTO.getTranslations() != null) {
            for (ContributionTypeTranslationDTO transDTO : createDTO.getTranslations()) {
                ContributionTypeTranslation translation = new ContributionTypeTranslation(
                        transDTO.getLocale(), transDTO.getName(), transDTO.getDescription());
                type.addTranslation(translation);
            }
        }

        type = contributionTypeRepository.save(type);
        log.info("Created contribution type: {} (id={})", type.getCode(), type.getId());
        return convertToDTO(type);
    }

    /**
     * Update a contribution type.
     * Cannot change isRequired if obligations or payments already exist.
     */
    @Transactional
    public ContributionTypeDTO updateType(Long id, ContributionTypeCreateDTO updateDTO) {
        ContributionType type = contributionTypeRepository.findByIdWithTranslationsAndObligations(id)
                .orElseThrow(() -> new RuntimeException("Contribution type not found with id: " + id));

        // Check if code is being changed to one that already exists
        if (!type.getCode().equals(updateDTO.getCode()) &&
                contributionTypeRepository.existsByCode(updateDTO.getCode())) {
            throw new RuntimeException("Contribution type with code '" + updateDTO.getCode() + "' already exists");
        }

        // If changing from required to optional, ensure no obligation exists
        if (type.getIsRequired() && !updateDTO.getIsRequired() && !type.getObligations().isEmpty()) {
            throw new RuntimeException("Cannot change type to optional while obligations exist. Remove the obligations first.");
        }

        type.setCode(updateDTO.getCode());
        type.setIsRequired(updateDTO.getIsRequired());
        if (updateDTO.getIsActive() != null) {
            type.setIsActive(updateDTO.getIsActive());
        }

        // Update translations: clear and re-add
        if (updateDTO.getTranslations() != null) {
            type.getTranslations().clear();
            for (ContributionTypeTranslationDTO transDTO : updateDTO.getTranslations()) {
                ContributionTypeTranslation translation = new ContributionTypeTranslation(
                        transDTO.getLocale(), transDTO.getName(), transDTO.getDescription());
                type.addTranslation(translation);
            }
        }

        type = contributionTypeRepository.save(type);
        log.info("Updated contribution type: {} (id={})", type.getCode(), type.getId());
        return convertToDTO(type);
    }

    /**
     * Soft-delete: deactivate a contribution type.
     */
    @Transactional
    public void deactivateType(Long id) {
        ContributionType type = contributionTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contribution type not found with id: " + id));
        type.setIsActive(false);
        contributionTypeRepository.save(type);
        log.info("Deactivated contribution type: {} (id={})", type.getCode(), type.getId());
    }

    /**
     * Reactivate a contribution type.
     */
    @Transactional
    public void activateType(Long id) {
        ContributionType type = contributionTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contribution type not found with id: " + id));
        type.setIsActive(true);
        contributionTypeRepository.save(type);
        log.info("Activated contribution type: {} (id={})", type.getCode(), type.getId());
    }

    // ===== DTO conversion =====

    private ContributionTypeDTO convertToDTO(ContributionType type) {
        ContributionTypeDTO dto = new ContributionTypeDTO();
        dto.setId(type.getId());
        dto.setCode(type.getCode());
        dto.setIsRequired(type.getIsRequired());
        dto.setIsActive(type.getIsActive());
        dto.setCreatedAt(type.getCreatedAt());

        if (type.getTranslations() != null) {
            dto.setTranslations(type.getTranslations().stream()
                    .map(this::convertTranslationToDTO)
                    .collect(Collectors.toList()));
        }

        if (type.getObligations() != null && !type.getObligations().isEmpty()) {
            dto.setObligations(type.getObligations().stream()
                    .map(obl -> convertObligationToDTO(type, obl))
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private ContributionTypeTranslationDTO convertTranslationToDTO(ContributionTypeTranslation translation) {
        ContributionTypeTranslationDTO dto = new ContributionTypeTranslationDTO();
        dto.setId(translation.getId());
        dto.setLocale(translation.getLocale());
        dto.setName(translation.getName());
        dto.setDescription(translation.getDescription());
        return dto;
    }

    private ContributionObligationDTO convertObligationToDTO(ContributionType type, ContributionObligation obligation) {
        ContributionObligationDTO dto = new ContributionObligationDTO();
        dto.setId(obligation.getId());
        dto.setContributionTypeId(type.getId());
        dto.setContributionTypeCode(type.getCode());
        dto.setAmount(obligation.getAmount());
        dto.setFrequency(obligation.getFrequency().name());
        dto.setStartDate(obligation.getStartDate());
        return dto;
    }
}

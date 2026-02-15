package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.ContributionObligationCreateDTO;
import com.mosque.crm.dto.ContributionObligationDTO;
import com.mosque.crm.entity.ContributionObligation;
import com.mosque.crm.entity.ContributionType;
import com.mosque.crm.entity.Currency;
import com.mosque.crm.enums.ContributionFrequency;
import com.mosque.crm.repository.ContributionObligationRepository;
import com.mosque.crm.repository.ContributionTypeRepository;
import com.mosque.crm.repository.CurrencyRepository;

/**
 * Service for managing ContributionObligations.
 *
 * Business rules:
 * - Only required contribution types can have obligations
 * - A required type can have multiple obligations (for historical tracking)
 * - Optional types must NOT have obligations
 * - Obligations only have a startDate; the "active" obligation is the one with the latest startDate <= today
 */
@Service
public class ContributionObligationService {

    private static final Logger log = LoggerFactory.getLogger(ContributionObligationService.class);

    private final ContributionObligationRepository obligationRepository;
    private final ContributionTypeRepository contributionTypeRepository;
    private final CurrencyRepository currencyRepository;

    public ContributionObligationService(ContributionObligationRepository obligationRepository,
                                          ContributionTypeRepository contributionTypeRepository,
                                          CurrencyRepository currencyRepository) {
        this.obligationRepository = obligationRepository;
        this.contributionTypeRepository = contributionTypeRepository;
        this.currencyRepository = currencyRepository;
    }

    /**
     * Get all obligations.
     */
    @Transactional(readOnly = true)
    public List<ContributionObligationDTO> getAllObligations() {
        return obligationRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get obligation by ID.
     */
    @Transactional(readOnly = true)
    public ContributionObligationDTO getObligationById(Long id) {
        ContributionObligation obligation = obligationRepository.findByIdWithType(id)
                .orElseThrow(() -> new RuntimeException("Contribution obligation not found with id: " + id));
        return convertToDTO(obligation);
    }

    /**
     * Get obligation for a specific contribution type.
     */
    @Transactional(readOnly = true)
    public ContributionObligationDTO getObligationByTypeId(Long typeId) {
        ContributionObligation obligation = obligationRepository.findByContributionTypeId(typeId)
                .orElseThrow(() -> new RuntimeException("No obligation found for contribution type id: " + typeId));
        return convertToDTO(obligation);
    }

    /**
     * Create a new obligation for a required contribution type.
     * Only startDate is used; the obligation is active from that date until a newer one supersedes it.
     */
    @Transactional
    public ContributionObligationDTO createObligation(ContributionObligationCreateDTO createDTO) {
        ContributionType type = contributionTypeRepository.findById(createDTO.getContributionTypeId())
                .orElseThrow(() -> new RuntimeException("Contribution type not found with id: " + createDTO.getContributionTypeId()));

        // Business rule: only required types can have obligations
        if (!type.getIsRequired()) {
            throw new RuntimeException("Cannot create obligation for optional contribution type: " + type.getCode());
        }

        ContributionFrequency frequency = ContributionFrequency.valueOf(createDTO.getFrequency().toUpperCase());

        ContributionObligation obligation = new ContributionObligation();
        obligation.setContributionType(type);
        obligation.setAmount(createDTO.getAmount());
        obligation.setFrequency(frequency);
        obligation.setStartDate(createDTO.getStartDate());

        if (createDTO.getCurrencyId() != null) {
            Currency currency = currencyRepository.findById(createDTO.getCurrencyId())
                    .orElseThrow(() -> new RuntimeException("Currency not found with id: " + createDTO.getCurrencyId()));
            obligation.setCurrency(currency);
        }

        obligation = obligationRepository.save(obligation);
        log.info("Created obligation for type {} (amount={}, frequency={}, startDate={})",
                type.getCode(), obligation.getAmount(), obligation.getFrequency(), obligation.getStartDate());
        return convertToDTO(obligation);
    }

    /**
     * Update an existing obligation.
     */
    @Transactional
    public ContributionObligationDTO updateObligation(Long id, ContributionObligationCreateDTO updateDTO) {
        ContributionObligation obligation = obligationRepository.findByIdWithType(id)
                .orElseThrow(() -> new RuntimeException("Contribution obligation not found with id: " + id));

        ContributionFrequency frequency = ContributionFrequency.valueOf(updateDTO.getFrequency().toUpperCase());

        obligation.setAmount(updateDTO.getAmount());
        obligation.setFrequency(frequency);
        obligation.setStartDate(updateDTO.getStartDate());

        if (updateDTO.getCurrencyId() != null) {
            Currency currency = currencyRepository.findById(updateDTO.getCurrencyId())
                    .orElseThrow(() -> new RuntimeException("Currency not found with id: " + updateDTO.getCurrencyId()));
            obligation.setCurrency(currency);
        } else {
            obligation.setCurrency(null);
        }

        obligation = obligationRepository.save(obligation);
        log.info("Updated obligation id={} (amount={}, frequency={})",
                obligation.getId(), obligation.getAmount(), obligation.getFrequency());
        return convertToDTO(obligation);
    }

    /**
     * Delete an obligation.
     */
    @Transactional
    public void deleteObligation(Long id) {
        ContributionObligation obligation = obligationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contribution obligation not found with id: " + id));
        obligationRepository.delete(obligation);
        log.info("Deleted obligation id={}", id);
    }

    // ===== DTO conversion =====

    private ContributionObligationDTO convertToDTO(ContributionObligation obligation) {
        ContributionObligationDTO dto = new ContributionObligationDTO();
        dto.setId(obligation.getId());
        dto.setContributionTypeId(obligation.getContributionType().getId());
        dto.setContributionTypeCode(obligation.getContributionType().getCode());
        dto.setAmount(obligation.getAmount());
        dto.setFrequency(obligation.getFrequency().name());
        dto.setStartDate(obligation.getStartDate());
        if (obligation.getCurrency() != null) {
            dto.setCurrencyId(obligation.getCurrency().getId());
            dto.setCurrencyCode(obligation.getCurrency().getCode());
            dto.setCurrencySymbol(obligation.getCurrency().getSymbol());
        }
        return dto;
    }
}

package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.OrganizationCurrencyCreateDTO;
import com.mosque.crm.dto.OrganizationCurrencyDTO;
import com.mosque.crm.entity.Currency;
import com.mosque.crm.entity.OrganizationCurrency;
import com.mosque.crm.repository.CurrencyRepository;
import com.mosque.crm.repository.OrganizationCurrencyRepository;

/**
 * Service for managing per-organization currency settings.
 */
@Service
public class OrganizationCurrencyService {

    private static final Logger log = LoggerFactory.getLogger(OrganizationCurrencyService.class);

    private final OrganizationCurrencyRepository organizationCurrencyRepository;
    private final CurrencyRepository currencyRepository;

    public OrganizationCurrencyService(OrganizationCurrencyRepository organizationCurrencyRepository,
                                  CurrencyRepository currencyRepository) {
        this.organizationCurrencyRepository = organizationCurrencyRepository;
        this.currencyRepository = currencyRepository;
    }

    @Transactional(readOnly = true)
    public List<OrganizationCurrencyDTO> getAllOrganizationCurrencies() {
        return organizationCurrencyRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrganizationCurrencyDTO> getActiveOrganizationCurrencies() {
        return organizationCurrencyRepository.findByIsActiveTrue()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public OrganizationCurrencyDTO addCurrency(OrganizationCurrencyCreateDTO createDTO) {
        Currency currency = currencyRepository.findById(createDTO.getCurrencyId())
                .orElseThrow(() -> new RuntimeException("Currency not found with id: " + createDTO.getCurrencyId()));

        if (organizationCurrencyRepository.existsByCurrencyId(createDTO.getCurrencyId())) {
            throw new RuntimeException("Currency " + currency.getCode() + " is already added to this organization");
        }

        OrganizationCurrency mc = new OrganizationCurrency();
        mc.setCurrency(currency);
        mc.setIsPrimary(createDTO.getIsPrimary() != null ? createDTO.getIsPrimary() : false);
        mc.setIsActive(createDTO.getIsActive() != null ? createDTO.getIsActive() : true);

        // If this is set as primary, clear other primaries
        if (Boolean.TRUE.equals(mc.getIsPrimary())) {
            clearPrimaryCurrency();
        }

        OrganizationCurrency saved = organizationCurrencyRepository.save(mc);
        log.info("Added currency {} to organization", currency.getCode());
        return convertToDTO(saved);
    }

    @Transactional
    public OrganizationCurrencyDTO updateOrganizationCurrency(Long id, OrganizationCurrencyCreateDTO updateDTO) {
        OrganizationCurrency mc = organizationCurrencyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Organization currency not found with id: " + id));

        if (updateDTO.getIsPrimary() != null) {
            if (Boolean.TRUE.equals(updateDTO.getIsPrimary())) {
                clearPrimaryCurrency();
            }
            mc.setIsPrimary(updateDTO.getIsPrimary());
        }

        if (updateDTO.getIsActive() != null) {
            mc.setIsActive(updateDTO.getIsActive());
        }

        OrganizationCurrency saved = organizationCurrencyRepository.save(mc);
        log.info("Updated organization currency {} (primary={}, active={})", 
                mc.getCurrency().getCode(), mc.getIsPrimary(), mc.getIsActive());
        return convertToDTO(saved);
    }

    @Transactional
    public void removeCurrency(Long id) {
        OrganizationCurrency mc = organizationCurrencyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Organization currency not found with id: " + id));
        log.info("Removing currency {} from organization", mc.getCurrency().getCode());
        organizationCurrencyRepository.delete(mc);
    }

    @Transactional
    public OrganizationCurrencyDTO setPrimaryCurrency(Long id) {
        OrganizationCurrency mc = organizationCurrencyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Organization currency not found with id: " + id));
        clearPrimaryCurrency();
        mc.setIsPrimary(true);
        OrganizationCurrency saved = organizationCurrencyRepository.save(mc);
        log.info("Set currency {} as primary", mc.getCurrency().getCode());
        return convertToDTO(saved);
    }

    private void clearPrimaryCurrency() {
        organizationCurrencyRepository.findByIsPrimaryTrue().ifPresent(existing -> {
            existing.setIsPrimary(false);
            organizationCurrencyRepository.save(existing);
        });
    }

    private OrganizationCurrencyDTO convertToDTO(OrganizationCurrency mc) {
        OrganizationCurrencyDTO dto = new OrganizationCurrencyDTO();
        dto.setId(mc.getId());
        dto.setCurrencyId(mc.getCurrency().getId());
        dto.setCurrencyCode(mc.getCurrency().getCode());
        dto.setCurrencyName(mc.getCurrency().getName());
        dto.setCurrencySymbol(mc.getCurrency().getSymbol());
        dto.setDecimalPlaces(mc.getCurrency().getDecimalPlaces());
        dto.setIsPrimary(mc.getIsPrimary());
        dto.setIsActive(mc.getIsActive());
        dto.setCreatedAt(mc.getCreatedAt());
        return dto;
    }
}

package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.MosqueCurrencyCreateDTO;
import com.mosque.crm.dto.MosqueCurrencyDTO;
import com.mosque.crm.entity.Currency;
import com.mosque.crm.entity.MosqueCurrency;
import com.mosque.crm.repository.CurrencyRepository;
import com.mosque.crm.repository.MosqueCurrencyRepository;

/**
 * Service for managing per-mosque currency settings.
 */
@Service
public class MosqueCurrencyService {

    private static final Logger log = LoggerFactory.getLogger(MosqueCurrencyService.class);

    private final MosqueCurrencyRepository mosqueCurrencyRepository;
    private final CurrencyRepository currencyRepository;

    public MosqueCurrencyService(MosqueCurrencyRepository mosqueCurrencyRepository,
                                  CurrencyRepository currencyRepository) {
        this.mosqueCurrencyRepository = mosqueCurrencyRepository;
        this.currencyRepository = currencyRepository;
    }

    @Transactional(readOnly = true)
    public List<MosqueCurrencyDTO> getAllMosqueCurrencies() {
        return mosqueCurrencyRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MosqueCurrencyDTO> getActiveMosqueCurrencies() {
        return mosqueCurrencyRepository.findByIsActiveTrue()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public MosqueCurrencyDTO addCurrency(MosqueCurrencyCreateDTO createDTO) {
        Currency currency = currencyRepository.findById(createDTO.getCurrencyId())
                .orElseThrow(() -> new RuntimeException("Currency not found with id: " + createDTO.getCurrencyId()));

        if (mosqueCurrencyRepository.existsByCurrencyId(createDTO.getCurrencyId())) {
            throw new RuntimeException("Currency " + currency.getCode() + " is already added to this mosque");
        }

        MosqueCurrency mc = new MosqueCurrency();
        mc.setCurrency(currency);
        mc.setIsPrimary(createDTO.getIsPrimary() != null ? createDTO.getIsPrimary() : false);
        mc.setIsActive(createDTO.getIsActive() != null ? createDTO.getIsActive() : true);

        // If this is set as primary, clear other primaries
        if (Boolean.TRUE.equals(mc.getIsPrimary())) {
            clearPrimaryCurrency();
        }

        MosqueCurrency saved = mosqueCurrencyRepository.save(mc);
        log.info("Added currency {} to mosque", currency.getCode());
        return convertToDTO(saved);
    }

    @Transactional
    public MosqueCurrencyDTO updateMosqueCurrency(Long id, MosqueCurrencyCreateDTO updateDTO) {
        MosqueCurrency mc = mosqueCurrencyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mosque currency not found with id: " + id));

        if (updateDTO.getIsPrimary() != null) {
            if (Boolean.TRUE.equals(updateDTO.getIsPrimary())) {
                clearPrimaryCurrency();
            }
            mc.setIsPrimary(updateDTO.getIsPrimary());
        }

        if (updateDTO.getIsActive() != null) {
            mc.setIsActive(updateDTO.getIsActive());
        }

        MosqueCurrency saved = mosqueCurrencyRepository.save(mc);
        log.info("Updated mosque currency {} (primary={}, active={})", 
                mc.getCurrency().getCode(), mc.getIsPrimary(), mc.getIsActive());
        return convertToDTO(saved);
    }

    @Transactional
    public void removeCurrency(Long id) {
        MosqueCurrency mc = mosqueCurrencyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mosque currency not found with id: " + id));
        log.info("Removing currency {} from mosque", mc.getCurrency().getCode());
        mosqueCurrencyRepository.delete(mc);
    }

    @Transactional
    public MosqueCurrencyDTO setPrimaryCurrency(Long id) {
        MosqueCurrency mc = mosqueCurrencyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mosque currency not found with id: " + id));
        clearPrimaryCurrency();
        mc.setIsPrimary(true);
        MosqueCurrency saved = mosqueCurrencyRepository.save(mc);
        log.info("Set currency {} as primary", mc.getCurrency().getCode());
        return convertToDTO(saved);
    }

    private void clearPrimaryCurrency() {
        mosqueCurrencyRepository.findByIsPrimaryTrue().ifPresent(existing -> {
            existing.setIsPrimary(false);
            mosqueCurrencyRepository.save(existing);
        });
    }

    private MosqueCurrencyDTO convertToDTO(MosqueCurrency mc) {
        MosqueCurrencyDTO dto = new MosqueCurrencyDTO();
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

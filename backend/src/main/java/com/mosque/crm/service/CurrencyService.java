package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.CurrencyDTO;
import com.mosque.crm.entity.Currency;
import com.mosque.crm.repository.CurrencyRepository;

/**
 * Service for managing global currency reference data.
 */
@Service
public class CurrencyService {

    private static final Logger log = LoggerFactory.getLogger(CurrencyService.class);

    private final CurrencyRepository currencyRepository;

    public CurrencyService(CurrencyRepository currencyRepository) {
        this.currencyRepository = currencyRepository;
    }

    @Transactional(readOnly = true)
    public List<CurrencyDTO> getAllCurrencies() {
        return currencyRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CurrencyDTO getCurrencyById(Long id) {
        Currency currency = currencyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Currency not found with id: " + id));
        return convertToDTO(currency);
    }

    @Transactional(readOnly = true)
    public CurrencyDTO getCurrencyByCode(String code) {
        Currency currency = currencyRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Currency not found with code: " + code));
        return convertToDTO(currency);
    }

    private CurrencyDTO convertToDTO(Currency currency) {
        CurrencyDTO dto = new CurrencyDTO();
        dto.setId(currency.getId());
        dto.setCode(currency.getCode());
        dto.setName(currency.getName());
        dto.setSymbol(currency.getSymbol());
        dto.setDecimalPlaces(currency.getDecimalPlaces());
        return dto;
    }
}

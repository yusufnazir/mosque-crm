package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.ExchangeRateCreateDTO;
import com.mosque.crm.dto.ExchangeRateDTO;
import com.mosque.crm.entity.Currency;
import com.mosque.crm.entity.ExchangeRate;
import com.mosque.crm.repository.CurrencyRepository;
import com.mosque.crm.repository.ExchangeRateRepository;

/**
 * Service for managing per-mosque exchange rates.
 */
@Service
public class ExchangeRateService {

    private static final Logger log = LoggerFactory.getLogger(ExchangeRateService.class);

    private final ExchangeRateRepository exchangeRateRepository;
    private final CurrencyRepository currencyRepository;

    public ExchangeRateService(ExchangeRateRepository exchangeRateRepository,
                                CurrencyRepository currencyRepository) {
        this.exchangeRateRepository = exchangeRateRepository;
        this.currencyRepository = currencyRepository;
    }

    @Transactional(readOnly = true)
    public List<ExchangeRateDTO> getAllExchangeRates() {
        return exchangeRateRepository.findByOrderByEffectiveDateDesc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExchangeRateDTO> getRatesByCurrencyPair(Long fromCurrencyId, Long toCurrencyId) {
        return exchangeRateRepository.findByCurrencyPair(fromCurrencyId, toCurrencyId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ExchangeRateDTO createExchangeRate(ExchangeRateCreateDTO createDTO) {
        Currency fromCurrency = currencyRepository.findById(createDTO.getFromCurrencyId())
                .orElseThrow(() -> new RuntimeException("From currency not found with id: " + createDTO.getFromCurrencyId()));
        Currency toCurrency = currencyRepository.findById(createDTO.getToCurrencyId())
                .orElseThrow(() -> new RuntimeException("To currency not found with id: " + createDTO.getToCurrencyId()));

        if (createDTO.getFromCurrencyId().equals(createDTO.getToCurrencyId())) {
            throw new RuntimeException("From and To currencies must be different");
        }

        if (exchangeRateRepository.existsByFromCurrencyIdAndToCurrencyIdAndEffectiveDate(
                createDTO.getFromCurrencyId(), createDTO.getToCurrencyId(), createDTO.getEffectiveDate())) {
            throw new RuntimeException("Exchange rate already exists for this currency pair on " + createDTO.getEffectiveDate());
        }

        ExchangeRate rate = new ExchangeRate();
        rate.setFromCurrency(fromCurrency);
        rate.setToCurrency(toCurrency);
        rate.setRate(createDTO.getRate());
        rate.setEffectiveDate(createDTO.getEffectiveDate());

        ExchangeRate saved = exchangeRateRepository.save(rate);
        log.info("Created exchange rate {} -> {} = {} (effective {})",
                fromCurrency.getCode(), toCurrency.getCode(), createDTO.getRate(), createDTO.getEffectiveDate());
        return convertToDTO(saved);
    }

    @Transactional
    public ExchangeRateDTO updateExchangeRate(Long id, ExchangeRateCreateDTO updateDTO) {
        ExchangeRate rate = exchangeRateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exchange rate not found with id: " + id));

        if (updateDTO.getFromCurrencyId() != null) {
            Currency fromCurrency = currencyRepository.findById(updateDTO.getFromCurrencyId())
                    .orElseThrow(() -> new RuntimeException("From currency not found"));
            rate.setFromCurrency(fromCurrency);
        }

        if (updateDTO.getToCurrencyId() != null) {
            Currency toCurrency = currencyRepository.findById(updateDTO.getToCurrencyId())
                    .orElseThrow(() -> new RuntimeException("To currency not found"));
            rate.setToCurrency(toCurrency);
        }

        if (updateDTO.getRate() != null) {
            rate.setRate(updateDTO.getRate());
        }

        if (updateDTO.getEffectiveDate() != null) {
            rate.setEffectiveDate(updateDTO.getEffectiveDate());
        }

        ExchangeRate saved = exchangeRateRepository.save(rate);
        log.info("Updated exchange rate {} -> {} = {} (effective {})",
                rate.getFromCurrency().getCode(), rate.getToCurrency().getCode(),
                rate.getRate(), rate.getEffectiveDate());
        return convertToDTO(saved);
    }

    @Transactional
    public void deleteExchangeRate(Long id) {
        ExchangeRate rate = exchangeRateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exchange rate not found with id: " + id));
        log.info("Deleting exchange rate {} -> {} (effective {})",
                rate.getFromCurrency().getCode(), rate.getToCurrency().getCode(), rate.getEffectiveDate());
        exchangeRateRepository.delete(rate);
    }

    private ExchangeRateDTO convertToDTO(ExchangeRate rate) {
        ExchangeRateDTO dto = new ExchangeRateDTO();
        dto.setId(rate.getId());
        dto.setFromCurrencyId(rate.getFromCurrency().getId());
        dto.setFromCurrencyCode(rate.getFromCurrency().getCode());
        dto.setFromCurrencyName(rate.getFromCurrency().getName());
        dto.setToCurrencyId(rate.getToCurrency().getId());
        dto.setToCurrencyCode(rate.getToCurrency().getCode());
        dto.setToCurrencyName(rate.getToCurrency().getName());
        dto.setRate(rate.getRate());
        dto.setEffectiveDate(rate.getEffectiveDate());
        dto.setCreatedAt(rate.getCreatedAt());
        return dto;
    }
}

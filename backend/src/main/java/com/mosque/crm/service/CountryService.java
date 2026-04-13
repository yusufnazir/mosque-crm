package com.mosque.crm.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.CountryDTO;
import com.mosque.crm.entity.Country;
import com.mosque.crm.entity.CountryTranslation;
import com.mosque.crm.repository.CountryRepository;

@Service
public class CountryService {

    private static final Logger log = LoggerFactory.getLogger(CountryService.class);

    private final CountryRepository countryRepository;

    public CountryService(CountryRepository countryRepository) {
        this.countryRepository = countryRepository;
    }

    @Transactional(readOnly = true)
    public List<CountryDTO> getAllCountries(String locale) {
        String normalizedLocale = normalizeLocale(locale);
        return countryRepository.findAllByOrderBySortOrderAsc()
                .stream()
                .map(country -> convertToDTO(country, normalizedLocale))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CountryDTO getCountryByIsoCode(String isoCode, String locale) {
        String normalizedLocale = normalizeLocale(locale);
        Country country = countryRepository.findByIsoCode(isoCode)
                .orElseThrow(() -> new RuntimeException("Country not found with isoCode: " + isoCode));
        return convertToDTO(country, normalizedLocale);
    }

    private CountryDTO convertToDTO(Country country, String locale) {
        CountryDTO dto = new CountryDTO();
        dto.setId(country.getId());
        dto.setIsoCode(country.getIsoCode());
        dto.setName(resolveName(country, locale));
        return dto;
    }

    private String resolveName(Country country, String locale) {
        Optional<CountryTranslation> exact = country.getTranslations().stream()
                .filter(t -> locale.equalsIgnoreCase(t.getLocale()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get().getName();
        }

        Optional<CountryTranslation> en = country.getTranslations().stream()
                .filter(t -> "en".equalsIgnoreCase(t.getLocale()))
                .findFirst();

        return en.map(CountryTranslation::getName).orElse(country.getIsoCode());
    }

    private String normalizeLocale(String locale) {
        if (locale == null || locale.trim().isEmpty()) return "en";
        String normalized = locale.trim().toLowerCase(Locale.ROOT);
        return normalized.startsWith("nl") ? "nl" : "en";
    }
}

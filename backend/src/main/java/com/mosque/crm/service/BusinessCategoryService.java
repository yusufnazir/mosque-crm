package com.mosque.crm.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.BusinessCategoryDTO;
import com.mosque.crm.entity.BusinessCategory;
import com.mosque.crm.entity.BusinessCategoryTranslation;
import com.mosque.crm.repository.BusinessCategoryRepository;

@Service
public class BusinessCategoryService {

    private final BusinessCategoryRepository businessCategoryRepository;

    public BusinessCategoryService(BusinessCategoryRepository businessCategoryRepository) {
        this.businessCategoryRepository = businessCategoryRepository;
    }

    @Transactional(readOnly = true)
    public List<BusinessCategoryDTO> listActive(String locale) {
        String normalized = normalizeLocale(locale);
        return businessCategoryRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(category -> toDto(category, normalized))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean isActiveCode(String code) {
        return code != null && !code.isBlank() && businessCategoryRepository.existsByCodeAndActiveTrue(code.trim());
    }

    private BusinessCategoryDTO toDto(BusinessCategory category, String locale) {
        BusinessCategoryDTO dto = new BusinessCategoryDTO();
        dto.setId(category.getId());
        dto.setCode(category.getCode());
        dto.setSortOrder(category.getSortOrder());
        dto.setName(resolveName(category, locale));
        return dto;
    }

    private String resolveName(BusinessCategory category, String locale) {
        Optional<BusinessCategoryTranslation> exact = category.getTranslations().stream()
                .filter(t -> locale.equalsIgnoreCase(t.getLocale()))
                .findFirst();
        if (exact.isPresent()) {
            return exact.get().getName();
        }
        return category.getTranslations().stream()
                .filter(t -> "en".equalsIgnoreCase(t.getLocale()))
                .map(BusinessCategoryTranslation::getName)
                .findFirst()
                .orElse(category.getCode());
    }

    private String normalizeLocale(String locale) {
        if (locale == null || locale.trim().isEmpty()) return "en";
        String normalized = locale.trim().toLowerCase(Locale.ROOT);
        return normalized.startsWith("nl") ? "nl" : "en";
    }
}

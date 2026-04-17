package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.SavedMemberFilterDTO;
import com.mosque.crm.dto.SavedMemberFilterRequest;
import com.mosque.crm.entity.SavedMemberFilter;
import com.mosque.crm.repository.SavedMemberFilterRepository;
import com.mosque.crm.subscription.FeatureKeys;

@Service
public class SavedMemberFilterService {

    private static final Logger log = LoggerFactory.getLogger(SavedMemberFilterService.class);

    private final SavedMemberFilterRepository repository;
    private final OrganizationSubscriptionService subscriptionService;

    public SavedMemberFilterService(SavedMemberFilterRepository repository,
                                    OrganizationSubscriptionService subscriptionService) {
        this.repository = repository;
        this.subscriptionService = subscriptionService;
    }

    // ==================== Read ====================

    @Transactional(readOnly = true)
    public List<SavedMemberFilterDTO> listFilters(Long userId) {
        return repository.findByCreatedByUserId(userId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // ==================== Write (gated) ====================

    @Transactional
    public SavedMemberFilterDTO createFilter(Long userId, Long organizationId, SavedMemberFilterRequest request) {
        subscriptionService.assertFeatureEnabled(organizationId, FeatureKeys.MEMBER_SAVED_FILTERS);

        SavedMemberFilter filter = new SavedMemberFilter();
        filter.setCreatedByUserId(userId);
        filter.setOrganizationId(organizationId);
        filter.setName(request.getName());
        filter.setFilterJson(request.getFilterJson());
        filter.setDefault(false);

        SavedMemberFilter saved = repository.save(filter);
        log.info("User {} created saved filter '{}' (id={})", userId, saved.getName(), saved.getId());
        return toDTO(saved);
    }

    @Transactional
    public SavedMemberFilterDTO updateFilter(Long id, Long userId, Long organizationId, SavedMemberFilterRequest request) {
        subscriptionService.assertFeatureEnabled(organizationId, FeatureKeys.MEMBER_SAVED_FILTERS);

        SavedMemberFilter filter = repository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Saved filter not found: " + id));

        if (!filter.getCreatedByUserId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Not your saved filter");
        }

        filter.setName(request.getName());
        filter.setFilterJson(request.getFilterJson());

        SavedMemberFilter saved = repository.save(filter);
        log.info("User {} updated saved filter id={}", userId, id);
        return toDTO(saved);
    }

    @Transactional
    public void deleteFilter(Long id, Long userId) {
        SavedMemberFilter filter = repository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Saved filter not found: " + id));

        if (!filter.getCreatedByUserId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Not your saved filter");
        }

        repository.delete(filter);
        log.info("User {} deleted saved filter id={}", userId, id);
    }

    @Transactional
    public SavedMemberFilterDTO setDefault(Long id, Long userId, Long organizationId) {
        subscriptionService.assertFeatureEnabled(organizationId, FeatureKeys.MEMBER_SAVED_FILTERS);

        // Clear current default for this user
        repository.findByCreatedByUserIdAndIsDefaultTrue(userId)
                .ifPresent(current -> {
                    current.setDefault(false);
                    repository.save(current);
                });

        SavedMemberFilter filter = repository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Saved filter not found: " + id));

        if (!filter.getCreatedByUserId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Not your saved filter");
        }

        filter.setDefault(true);
        SavedMemberFilter saved = repository.save(filter);
        log.info("User {} set saved filter id={} as default", userId, id);
        return toDTO(saved);
    }

    // ==================== Mapping ====================

    private SavedMemberFilterDTO toDTO(SavedMemberFilter entity) {
        SavedMemberFilterDTO dto = new SavedMemberFilterDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setFilterJson(entity.getFilterJson());
        dto.setDefault(entity.isDefault());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }
}

package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.EventResourceCategoryCreateDTO;
import com.mosque.crm.dto.EventResourceCategoryDTO;
import com.mosque.crm.dto.EventResourceCreateDTO;
import com.mosque.crm.dto.EventResourceDTO;
import com.mosque.crm.dto.EventResourceTypeCreateDTO;
import com.mosque.crm.dto.EventResourceTypeDTO;
import com.mosque.crm.entity.EventResource;
import com.mosque.crm.entity.EventResourceAssignment;
import com.mosque.crm.entity.EventResourceCategory;
import com.mosque.crm.entity.EventResourceType;
import com.mosque.crm.enums.EventKind;
import com.mosque.crm.enums.EventResourceAssignmentStatus;
import com.mosque.crm.repository.EventResourceAssignmentRepository;
import com.mosque.crm.repository.EventResourceCategoryRepository;
import com.mosque.crm.repository.EventResourceRepository;
import com.mosque.crm.repository.EventResourceTypeRepository;

@Service
public class EventResourceService {

    private final EventReferenceService eventReferenceService;
    private final EventResourceCategoryRepository categoryRepository;
    private final EventResourceTypeRepository typeRepository;
    private final EventResourceRepository resourceRepository;
    private final EventResourceAssignmentRepository assignmentRepository;

    public EventResourceService(
            EventReferenceService eventReferenceService,
            EventResourceCategoryRepository categoryRepository,
            EventResourceTypeRepository typeRepository,
            EventResourceRepository resourceRepository,
            EventResourceAssignmentRepository assignmentRepository) {
        this.eventReferenceService = eventReferenceService;
        this.categoryRepository = categoryRepository;
        this.typeRepository = typeRepository;
        this.resourceRepository = resourceRepository;
        this.assignmentRepository = assignmentRepository;
    }

    public List<EventResourceCategoryDTO> listCategories(EventKind eventKind, Long eventId) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        return categoryRepository.findByEventKindAndEventIdOrderBySortOrderAscNameAsc(eventKind, eventId)
                .stream().map(this::toCategoryDTO).collect(Collectors.toList());
    }

    @Transactional
    public EventResourceCategoryDTO createCategory(EventKind eventKind, Long eventId, EventResourceCategoryCreateDTO dto) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        EventResourceCategory cat = new EventResourceCategory();
        cat.setEventKind(eventKind);
        cat.setEventId(eventId);
        cat.setName(dto.getName());
        cat.setDescription(dto.getDescription());
        cat.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        return toCategoryDTO(categoryRepository.save(cat));
    }

    @Transactional
    public EventResourceCategoryDTO updateCategory(Long id, EventResourceCategoryCreateDTO dto) {
        EventResourceCategory cat = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource category not found: " + id));
        cat.setName(dto.getName());
        cat.setDescription(dto.getDescription());
        if (dto.getSortOrder() != null) {
            cat.setSortOrder(dto.getSortOrder());
        }
        return toCategoryDTO(categoryRepository.save(cat));
    }

    @Transactional
    public void deleteCategory(Long id) {
        EventResourceCategory cat = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource category not found: " + id));
        if (typeRepository.countByCategoryId(id) > 0) {
            throw new RuntimeException("Cannot delete category with existing types");
        }
        categoryRepository.delete(cat);
    }

    public List<EventResourceTypeDTO> listTypes(Long categoryId) {
        return typeRepository.findByCategoryIdOrderBySortOrderAscNameAsc(categoryId)
                .stream().map(this::toTypeDTO).collect(Collectors.toList());
    }

    @Transactional
    public EventResourceTypeDTO createType(Long categoryId, EventResourceTypeCreateDTO dto) {
        EventResourceCategory cat = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Resource category not found: " + categoryId));
        EventResourceType type = new EventResourceType();
        type.setCategory(cat);
        type.setName(dto.getName());
        type.setDescription(dto.getDescription());
        type.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        return toTypeDTO(typeRepository.save(type));
    }

    @Transactional
    public EventResourceTypeDTO updateType(Long id, EventResourceTypeCreateDTO dto) {
        EventResourceType type = typeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource type not found: " + id));
        type.setName(dto.getName());
        type.setDescription(dto.getDescription());
        if (dto.getSortOrder() != null) {
            type.setSortOrder(dto.getSortOrder());
        }
        return toTypeDTO(typeRepository.save(type));
    }

    @Transactional
    public void deleteType(Long id) {
        if (resourceRepository.countByResourceTypeId(id) > 0) {
            throw new RuntimeException("Cannot delete type with existing resources");
        }
        typeRepository.deleteById(id);
    }

    public List<EventResourceDTO> listResources(Long typeId) {
        return resourceRepository.findByResourceTypeIdOrderByNameAsc(typeId)
                .stream().map(this::toResourceDTO).collect(Collectors.toList());
    }

    @Transactional
    public EventResourceDTO createResource(Long typeId, EventResourceCreateDTO dto) {
        EventResourceType type = typeRepository.findById(typeId)
                .orElseThrow(() -> new RuntimeException("Resource type not found: " + typeId));
        EventResource resource = new EventResource();
        resource.setResourceType(type);
        resource.setName(dto.getName());
        resource.setDescription(dto.getDescription());
        resource.setAssignable(Boolean.TRUE.equals(dto.getAssignable()));
        return toResourceDTO(resourceRepository.save(resource));
    }

    @Transactional
    public EventResourceDTO updateResource(Long id, EventResourceCreateDTO dto) {
        EventResource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Resource not found: " + id));
        resource.setName(dto.getName());
        resource.setDescription(dto.getDescription());
        if (dto.getAssignable() != null) {
            resource.setAssignable(dto.getAssignable());
        }
        return toResourceDTO(resourceRepository.save(resource));
    }

    @Transactional
    public void deleteResource(Long id) {
        assignmentRepository.deleteByResourceId(id);
        resourceRepository.deleteById(id);
    }

    private EventResourceCategoryDTO toCategoryDTO(EventResourceCategory cat) {
        EventResourceCategoryDTO dto = new EventResourceCategoryDTO();
        dto.setId(cat.getId());
        dto.setEventKind(cat.getEventKind().name());
        dto.setEventId(cat.getEventId());
        dto.setName(cat.getName());
        dto.setDescription(cat.getDescription());
        dto.setSortOrder(cat.getSortOrder());
        return dto;
    }

    private EventResourceTypeDTO toTypeDTO(EventResourceType type) {
        EventResourceTypeDTO dto = new EventResourceTypeDTO();
        dto.setId(type.getId());
        dto.setCategoryId(type.getCategory().getId());
        dto.setName(type.getName());
        dto.setDescription(type.getDescription());
        dto.setSortOrder(type.getSortOrder());
        return dto;
    }

    private EventResourceDTO toResourceDTO(EventResource resource) {
        EventResourceDTO dto = new EventResourceDTO();
        dto.setId(resource.getId());
        dto.setResourceTypeId(resource.getResourceType().getId());
        dto.setName(resource.getName());
        dto.setDescription(resource.getDescription());
        dto.setAssignable(resource.isAssignable());
        assignmentRepository.findByResourceIdAndStatus(resource.getId(), EventResourceAssignmentStatus.ACTIVE)
                .ifPresent(active -> {
                    dto.setActiveAssignmentStatus(active.getStatus().name());
                    dto.setActiveAssignmentId(active.getId());
                    dto.setAssignedPersonId(active.getPerson().getId());
                    dto.setAssignedPersonName(formatPersonName(active.getPerson()));
                });
        return dto;
    }

    private String formatPersonName(com.mosque.crm.entity.Person person) {
        String first = person.getFirstName() != null ? person.getFirstName() : "";
        String last = person.getLastName() != null ? person.getLastName() : "";
        return (first + " " + last).trim();
    }
}

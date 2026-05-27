package com.mosque.crm.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.EventMemberGroup;
import com.mosque.crm.entity.EventResource;
import com.mosque.crm.entity.EventResourceCategory;
import com.mosque.crm.entity.EventResourceType;
import com.mosque.crm.enums.EventKind;
import com.mosque.crm.repository.EventMemberGroupMemberRepository;
import com.mosque.crm.repository.EventMemberGroupRepository;
import com.mosque.crm.repository.EventResourceAssignmentRepository;
import com.mosque.crm.repository.EventResourceCategoryRepository;
import com.mosque.crm.repository.EventResourceRepository;
import com.mosque.crm.repository.EventResourceTypeRepository;
import com.mosque.crm.repository.EventRoleRepository;
import com.mosque.crm.repository.EventSacrificeAnimalRepository;
import com.mosque.crm.repository.EventSacrificeAnimalShareRepository;

@Service
public class EventFeatureCleanupService {

    private final EventResourceCategoryRepository categoryRepository;
    private final EventResourceTypeRepository typeRepository;
    private final EventResourceRepository resourceRepository;
    private final EventResourceAssignmentRepository assignmentRepository;
    private final EventRoleRepository roleRepository;
    private final EventMemberGroupRepository groupRepository;
    private final EventMemberGroupMemberRepository groupMemberRepository;
    private final EventSacrificeAnimalRepository sacrificeAnimalRepository;
    private final EventSacrificeAnimalShareRepository sacrificeShareRepository;

    public EventFeatureCleanupService(
            EventResourceCategoryRepository categoryRepository,
            EventResourceTypeRepository typeRepository,
            EventResourceRepository resourceRepository,
            EventResourceAssignmentRepository assignmentRepository,
            EventRoleRepository roleRepository,
            EventMemberGroupRepository groupRepository,
            EventMemberGroupMemberRepository groupMemberRepository,
            EventSacrificeAnimalRepository sacrificeAnimalRepository,
            EventSacrificeAnimalShareRepository sacrificeShareRepository) {
        this.categoryRepository = categoryRepository;
        this.typeRepository = typeRepository;
        this.resourceRepository = resourceRepository;
        this.assignmentRepository = assignmentRepository;
        this.roleRepository = roleRepository;
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.sacrificeAnimalRepository = sacrificeAnimalRepository;
        this.sacrificeShareRepository = sacrificeShareRepository;
    }

    @Transactional
    public void deleteAllForEvent(EventKind eventKind, Long eventId) {
        List<EventResourceCategory> categories = categoryRepository
                .findByEventKindAndEventIdOrderBySortOrderAscNameAsc(eventKind, eventId);
        for (EventResourceCategory category : categories) {
            deleteCategoryTree(category.getId());
        }

        List<EventMemberGroup> groups = groupRepository.findByEventKindAndEventIdOrderByNameAsc(eventKind, eventId);
        for (EventMemberGroup group : groups) {
            groupMemberRepository.deleteByGroupId(group.getId());
            groupRepository.delete(group);
        }

        roleRepository.deleteByEventKindAndEventId(eventKind, eventId);

        sacrificeAnimalRepository.findByEventKindAndEventIdOrderByAnimalNumberAsc(eventKind, eventId)
                .forEach(animal -> {
                    sacrificeShareRepository.deleteByAnimalId(animal.getId());
                    sacrificeAnimalRepository.delete(animal);
                });
    }

    private void deleteCategoryTree(Long categoryId) {
        List<EventResourceType> types = typeRepository.findByCategoryIdOrderBySortOrderAscNameAsc(categoryId);
        for (EventResourceType type : types) {
            List<EventResource> resources = resourceRepository.findByResourceTypeIdOrderByNameAsc(type.getId());
            for (EventResource resource : resources) {
                assignmentRepository.deleteByResourceId(resource.getId());
                resourceRepository.delete(resource);
            }
            typeRepository.delete(type);
        }
        categoryRepository.deleteById(categoryId);
    }
}

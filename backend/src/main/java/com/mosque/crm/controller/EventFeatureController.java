package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.EventMemberGroupCreateDTO;
import com.mosque.crm.dto.EventMemberGroupDTO;
import com.mosque.crm.dto.EventMemberGroupMemberCreateDTO;
import com.mosque.crm.dto.EventMemberGroupMemberDTO;
import com.mosque.crm.dto.EventResourceAssignmentCreateDTO;
import com.mosque.crm.dto.EventResourceAssignmentDTO;
import com.mosque.crm.dto.EventResourceCategoryCreateDTO;
import com.mosque.crm.dto.EventResourceCategoryDTO;
import com.mosque.crm.dto.EventResourceCreateDTO;
import com.mosque.crm.dto.EventResourceDTO;
import com.mosque.crm.dto.EventResourceTypeCreateDTO;
import com.mosque.crm.dto.EventResourceTypeDTO;
import com.mosque.crm.dto.EventRoleCreateDTO;
import com.mosque.crm.dto.EventRoleDTO;
import com.mosque.crm.dto.EventSacrificeAnimalCreateDTO;
import com.mosque.crm.dto.EventSacrificeAnimalDTO;
import com.mosque.crm.dto.EventSacrificeAnimalShareCreateDTO;
import com.mosque.crm.dto.EventSacrificeAnimalShareDTO;
import com.mosque.crm.dto.EventSacrificeAnimalSummaryDTO;
import com.mosque.crm.dto.EventSacrificeAnimalUpdateDTO;
import com.mosque.crm.enums.EventKind;
import com.mosque.crm.service.EventMemberGroupService;
import com.mosque.crm.service.EventReferenceService;
import com.mosque.crm.service.EventResourceAssignmentService;
import com.mosque.crm.service.EventResourceService;
import com.mosque.crm.service.EventRoleService;
import com.mosque.crm.service.EventSacrificeAnimalService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/event-features/{eventKind}/{eventId}")
@CrossOrigin(origins = "*")
public class EventFeatureController {

    private final EventReferenceService eventReferenceService;
    private final EventResourceService resourceService;
    private final EventResourceAssignmentService assignmentService;
    private final EventRoleService roleService;
    private final EventMemberGroupService memberGroupService;
    private final EventSacrificeAnimalService sacrificeAnimalService;

    public EventFeatureController(
            EventReferenceService eventReferenceService,
            EventResourceService resourceService,
            EventResourceAssignmentService assignmentService,
            EventRoleService roleService,
            EventMemberGroupService memberGroupService,
            EventSacrificeAnimalService sacrificeAnimalService) {
        this.eventReferenceService = eventReferenceService;
        this.resourceService = resourceService;
        this.assignmentService = assignmentService;
        this.roleService = roleService;
        this.memberGroupService = memberGroupService;
        this.sacrificeAnimalService = sacrificeAnimalService;
    }

    // Resource categories
    @GetMapping("/resource-categories")
    public List<EventResourceCategoryDTO> listCategories(
            @PathVariable String eventKind, @PathVariable Long eventId) {
        return resourceService.listCategories(parseKind(eventKind), eventId);
    }

    @PostMapping("/resource-categories")
    public ResponseEntity<EventResourceCategoryDTO> createCategory(
            @PathVariable String eventKind, @PathVariable Long eventId,
            @Valid @RequestBody EventResourceCategoryCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(resourceService.createCategory(parseKind(eventKind), eventId, dto));
    }

    @PutMapping("/resource-categories/{id}")
    public EventResourceCategoryDTO updateCategory(
            @PathVariable Long id, @Valid @RequestBody EventResourceCategoryCreateDTO dto) {
        return resourceService.updateCategory(id, dto);
    }

    @DeleteMapping("/resource-categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        resourceService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    // Resource types
    @GetMapping("/resource-categories/{categoryId}/types")
    public List<EventResourceTypeDTO> listTypes(@PathVariable Long categoryId) {
        return resourceService.listTypes(categoryId);
    }

    @PostMapping("/resource-categories/{categoryId}/types")
    public ResponseEntity<EventResourceTypeDTO> createType(
            @PathVariable Long categoryId, @Valid @RequestBody EventResourceTypeCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.createType(categoryId, dto));
    }

    @PutMapping("/resource-types/{id}")
    public EventResourceTypeDTO updateType(
            @PathVariable Long id, @Valid @RequestBody EventResourceTypeCreateDTO dto) {
        return resourceService.updateType(id, dto);
    }

    @DeleteMapping("/resource-types/{id}")
    public ResponseEntity<Void> deleteType(@PathVariable Long id) {
        resourceService.deleteType(id);
        return ResponseEntity.noContent().build();
    }

    // Resources
    @GetMapping("/resource-types/{typeId}/resources")
    public List<EventResourceDTO> listResources(@PathVariable Long typeId) {
        return resourceService.listResources(typeId);
    }

    @PostMapping("/resource-types/{typeId}/resources")
    public ResponseEntity<EventResourceDTO> createResource(
            @PathVariable Long typeId, @Valid @RequestBody EventResourceCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.createResource(typeId, dto));
    }

    @PutMapping("/resources/{id}")
    public EventResourceDTO updateResource(
            @PathVariable Long id, @Valid @RequestBody EventResourceCreateDTO dto) {
        return resourceService.updateResource(id, dto);
    }

    @DeleteMapping("/resources/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }

    // Assignments
    @GetMapping("/assignments")
    public List<EventResourceAssignmentDTO> listAssignments(
            @PathVariable String eventKind, @PathVariable Long eventId) {
        return assignmentService.listByEvent(parseKind(eventKind), eventId);
    }

    @PostMapping("/resources/{resourceId}/assignments")
    public ResponseEntity<EventResourceAssignmentDTO> createAssignment(
            @PathVariable Long resourceId, @Valid @RequestBody EventResourceAssignmentCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.createAssignment(resourceId, dto));
    }

    @PutMapping("/assignments/{id}/complete")
    public EventResourceAssignmentDTO completeAssignment(@PathVariable Long id) {
        return assignmentService.completeAssignment(id);
    }

    @PutMapping("/assignments/{id}/cancel")
    public EventResourceAssignmentDTO cancelAssignment(@PathVariable Long id) {
        return assignmentService.cancelAssignment(id);
    }

    // Roles
    @GetMapping("/roles")
    public List<EventRoleDTO> listRoles(
            @PathVariable String eventKind, @PathVariable Long eventId) {
        return roleService.listRoles(parseKind(eventKind), eventId);
    }

    @PostMapping("/roles")
    public ResponseEntity<EventRoleDTO> createRole(
            @PathVariable String eventKind, @PathVariable Long eventId,
            @Valid @RequestBody EventRoleCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(roleService.createRole(parseKind(eventKind), eventId, dto));
    }

    @PutMapping("/roles/{id}")
    public EventRoleDTO updateRole(
            @PathVariable Long id, @Valid @RequestBody EventRoleCreateDTO dto) {
        return roleService.updateRole(id, dto);
    }

    @DeleteMapping("/roles/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    // Member groups
    @GetMapping("/member-groups")
    public List<EventMemberGroupDTO> listGroups(
            @PathVariable String eventKind, @PathVariable Long eventId) {
        return memberGroupService.listGroups(parseKind(eventKind), eventId);
    }

    @PostMapping("/member-groups")
    public ResponseEntity<EventMemberGroupDTO> createGroup(
            @PathVariable String eventKind, @PathVariable Long eventId,
            @Valid @RequestBody EventMemberGroupCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(memberGroupService.createGroup(parseKind(eventKind), eventId, dto));
    }

    @PutMapping("/member-groups/{id}")
    public EventMemberGroupDTO updateGroup(
            @PathVariable Long id, @Valid @RequestBody EventMemberGroupCreateDTO dto) {
        return memberGroupService.updateGroup(id, dto);
    }

    @DeleteMapping("/member-groups/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        memberGroupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/member-groups/{groupId}/members")
    public List<EventMemberGroupMemberDTO> listGroupMembers(@PathVariable Long groupId) {
        return memberGroupService.listMembers(groupId);
    }

    @PostMapping("/member-groups/{groupId}/members")
    public ResponseEntity<EventMemberGroupMemberDTO> addGroupMember(
            @PathVariable Long groupId, @Valid @RequestBody EventMemberGroupMemberCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(memberGroupService.addMember(groupId, dto));
    }

    @PutMapping("/member-groups/{groupId}/members/{memberId}")
    public EventMemberGroupMemberDTO updateGroupMember(
            @PathVariable Long groupId, @PathVariable Long memberId,
            @Valid @RequestBody EventMemberGroupMemberCreateDTO dto) {
        return memberGroupService.updateMember(groupId, memberId, dto);
    }

    @DeleteMapping("/member-groups/{groupId}/members/{memberId}")
    public ResponseEntity<Void> removeGroupMember(
            @PathVariable Long groupId, @PathVariable Long memberId) {
        memberGroupService.removeMember(groupId, memberId);
        return ResponseEntity.noContent().build();
    }

    // Sacrifice animals
    @GetMapping("/sacrifice-animals")
    public List<EventSacrificeAnimalDTO> listSacrificeAnimals(
            @PathVariable String eventKind, @PathVariable Long eventId) {
        return sacrificeAnimalService.listAnimals(parseKind(eventKind), eventId);
    }

    @GetMapping("/sacrifice-animals/summary")
    public EventSacrificeAnimalSummaryDTO getSacrificeAnimalsSummary(
            @PathVariable String eventKind, @PathVariable Long eventId) {
        return sacrificeAnimalService.getSummary(parseKind(eventKind), eventId);
    }

    @GetMapping("/sacrifice-animals/{id}")
    public EventSacrificeAnimalDTO getSacrificeAnimal(@PathVariable Long id) {
        return sacrificeAnimalService.getAnimal(id);
    }

    @PostMapping("/sacrifice-animals")
    public ResponseEntity<EventSacrificeAnimalDTO> createSacrificeAnimal(
            @PathVariable String eventKind, @PathVariable Long eventId,
            @Valid @RequestBody EventSacrificeAnimalCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sacrificeAnimalService.createAnimal(parseKind(eventKind), eventId, dto));
    }

    @PutMapping("/sacrifice-animals/{id}")
    public EventSacrificeAnimalDTO updateSacrificeAnimal(
            @PathVariable Long id, @Valid @RequestBody EventSacrificeAnimalUpdateDTO dto) {
        return sacrificeAnimalService.updateAnimal(id, dto);
    }

    @DeleteMapping("/sacrifice-animals/{id}")
    public ResponseEntity<Void> deleteSacrificeAnimal(@PathVariable Long id) {
        sacrificeAnimalService.deleteAnimal(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sacrifice-animals/{animalId}/shares")
    public List<EventSacrificeAnimalShareDTO> listSacrificeShares(@PathVariable Long animalId) {
        return sacrificeAnimalService.listShares(animalId);
    }

    @PostMapping("/sacrifice-animals/{animalId}/shares")
    public ResponseEntity<EventSacrificeAnimalShareDTO> addSacrificeShare(
            @PathVariable Long animalId, @Valid @RequestBody EventSacrificeAnimalShareCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sacrificeAnimalService.addShare(animalId, dto));
    }

    @PutMapping("/sacrifice-animals/{animalId}/shares/{shareId}")
    public EventSacrificeAnimalShareDTO updateSacrificeShare(
            @PathVariable Long animalId, @PathVariable Long shareId,
            @Valid @RequestBody EventSacrificeAnimalShareCreateDTO dto) {
        return sacrificeAnimalService.updateShare(animalId, shareId, dto);
    }

    @PostMapping("/sacrifice-animals/{animalId}/shares/{shareId}/mark-entitlement-received")
    public EventSacrificeAnimalShareDTO markSacrificeShareEntitlementReceived(
            @PathVariable Long animalId, @PathVariable Long shareId) {
        return sacrificeAnimalService.markEntitlementReceived(animalId, shareId);
    }

    @DeleteMapping("/sacrifice-animals/{animalId}/shares/{shareId}")
    public ResponseEntity<Void> deleteSacrificeShare(
            @PathVariable Long animalId, @PathVariable Long shareId) {
        sacrificeAnimalService.deleteShare(animalId, shareId);
        return ResponseEntity.noContent().build();
    }

    private EventKind parseKind(String eventKind) {
        return eventReferenceService.parseEventKind(eventKind);
    }
}

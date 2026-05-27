package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.EventRoleCreateDTO;
import com.mosque.crm.dto.EventRoleDTO;
import com.mosque.crm.entity.EventRole;
import com.mosque.crm.enums.EventKind;
import com.mosque.crm.repository.EventMemberGroupMemberRepository;
import com.mosque.crm.repository.EventRoleRepository;

@Service
public class EventRoleService {

    private final EventReferenceService eventReferenceService;
    private final EventRoleRepository roleRepository;
    private final EventMemberGroupMemberRepository groupMemberRepository;

    public EventRoleService(
            EventReferenceService eventReferenceService,
            EventRoleRepository roleRepository,
            EventMemberGroupMemberRepository groupMemberRepository) {
        this.eventReferenceService = eventReferenceService;
        this.roleRepository = roleRepository;
        this.groupMemberRepository = groupMemberRepository;
    }

    public List<EventRoleDTO> listRoles(EventKind eventKind, Long eventId) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        return roleRepository.findByEventKindAndEventIdOrderBySortOrderAscNameAsc(eventKind, eventId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public EventRoleDTO createRole(EventKind eventKind, Long eventId, EventRoleCreateDTO dto) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        EventRole role = new EventRole();
        role.setEventKind(eventKind);
        role.setEventId(eventId);
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
        role.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        role.setMaxMembers(dto.getMaxMembers());
        return toDTO(roleRepository.save(role));
    }

    @Transactional
    public EventRoleDTO updateRole(Long id, EventRoleCreateDTO dto) {
        EventRole role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event role not found: " + id));
        role.setName(dto.getName());
        role.setDescription(dto.getDescription());
        if (dto.getSortOrder() != null) {
            role.setSortOrder(dto.getSortOrder());
        }
        role.setMaxMembers(dto.getMaxMembers());
        return toDTO(roleRepository.save(role));
    }

    @Transactional
    public void deleteRole(Long id) {
        if (groupMemberRepository.countByEventRoleId(id) > 0) {
            throw new RuntimeException("Cannot delete role that is assigned to group members");
        }
        roleRepository.deleteById(id);
    }

    public EventRole getRoleForEvent(Long roleId, EventKind eventKind, Long eventId) {
        EventRole role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Event role not found: " + roleId));
        if (role.getEventKind() != eventKind || !role.getEventId().equals(eventId)) {
            throw new RuntimeException("Event role does not belong to this event");
        }
        return role;
    }

    private EventRoleDTO toDTO(EventRole role) {
        EventRoleDTO dto = new EventRoleDTO();
        dto.setId(role.getId());
        dto.setEventKind(role.getEventKind().name());
        dto.setEventId(role.getEventId());
        dto.setName(role.getName());
        dto.setDescription(role.getDescription());
        dto.setSortOrder(role.getSortOrder());
        dto.setMaxMembers(role.getMaxMembers());
        dto.setMemberCount(groupMemberRepository.countByEventRoleId(role.getId()));
        return dto;
    }
}

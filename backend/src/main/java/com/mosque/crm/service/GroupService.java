package com.mosque.crm.service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

import com.mosque.crm.dto.GroupDTO;
import com.mosque.crm.dto.GroupMemberDTO;
import com.mosque.crm.dto.GroupRoleDTO;
import com.mosque.crm.dto.GroupRoleTranslationDTO;
import com.mosque.crm.dto.GroupTranslationDTO;
import com.mosque.crm.entity.Group;
import com.mosque.crm.entity.GroupMember;
import com.mosque.crm.entity.GroupRole;
import com.mosque.crm.entity.GroupRoleTranslation;
import com.mosque.crm.entity.GroupTranslation;
import com.mosque.crm.entity.Person;
import com.mosque.crm.repository.GroupMemberRepository;
import com.mosque.crm.repository.GroupRepository;
import com.mosque.crm.repository.GroupRoleRepository;
import com.mosque.crm.repository.PersonRepository;

@Service
@Transactional
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupRoleRepository groupRoleRepository;
    private final PersonRepository personRepository;
    private final EntityManager entityManager;

    public GroupService(GroupRepository groupRepository, GroupMemberRepository groupMemberRepository, GroupRoleRepository groupRoleRepository, PersonRepository personRepository, EntityManager entityManager) {
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupRoleRepository = groupRoleRepository;
        this.personRepository = personRepository;
        this.entityManager = entityManager;
    }

    public GroupDTO createGroup(GroupDTO dto) {
        Group g = new Group();
        g.setName(dto.getName());
        g.setDescription(dto.getDescription());
        g.setStartDate(dto.getStartDate());
        g.setEndDate(dto.getEndDate());
        g.setIsActive(dto.getIsActive() == null ? true : dto.getIsActive());
        g.setCreatedBy(dto.getCreatedBy());
        g.setMosqueId(dto.getMosqueId());

        // Add translations if provided
        if (dto.getTranslations() != null) {
            for (GroupTranslationDTO transDTO : dto.getTranslations()) {
                GroupTranslation translation = new GroupTranslation(
                        transDTO.getLocale(), transDTO.getName(), transDTO.getDescription());
                g.addTranslation(translation);
            }
        }

        Group saved = groupRepository.save(g);
        return toDto(saved);
    }

    public Optional<GroupDTO> getGroup(Long id) {
        return groupRepository.findById(id).map(this::toDto);
    }

    public List<GroupDTO> listGroups() {
        return groupRepository.findAll().stream().map(this::toDto).collect(Collectors.toList());
    }

    public GroupDTO updateGroup(Long id, GroupDTO dto) {
        Group g = groupRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Group not found"));
        g.setName(dto.getName());
        g.setDescription(dto.getDescription());
        g.setStartDate(dto.getStartDate());
        g.setEndDate(dto.getEndDate());
        g.setIsActive(dto.getIsActive());
        g.setCreatedBy(dto.getCreatedBy());

        // Update translations: clear, flush deletes, then re-add
        if (dto.getTranslations() != null) {
            g.getTranslations().clear();
            entityManager.flush(); // flush deletes before inserts to avoid unique constraint violation
            for (GroupTranslationDTO transDTO : dto.getTranslations()) {
                GroupTranslation translation = new GroupTranslation(
                        transDTO.getLocale(), transDTO.getName(), transDTO.getDescription());
                g.addTranslation(translation);
            }
        }

        Group saved = groupRepository.save(g);
        return toDto(saved);
    }

    public void deleteGroup(Long id) {
        groupRepository.deleteById(id);
    }

    public GroupMemberDTO addMember(GroupMemberDTO dto) {
        Group g = groupRepository.findById(dto.getGroupId()).orElseThrow(() -> new IllegalArgumentException("Group not found"));
        Person p = personRepository.findById(dto.getPersonId()).orElseThrow(() -> new IllegalArgumentException("Person not found"));

        // Prevent duplicate membership
        if (groupMemberRepository.findByGroupIdAndPersonId(dto.getGroupId(), dto.getPersonId()).isPresent()) {
            throw new IllegalArgumentException("Person is already a member of this group");
        }

        GroupMember gm = new GroupMember(g, p);
        gm.setStartDate(dto.getStartDate());
        gm.setEndDate(dto.getEndDate());
        gm.setRoleInGroup(dto.getRoleInGroup());
        // Set group role if provided
        if (dto.getGroupRoleId() != null) {
            GroupRole role = groupRoleRepository.findById(dto.getGroupRoleId())
                    .orElseThrow(() -> new IllegalArgumentException("Group role not found"));
            gm.setGroupRole(role);
        }
        gm.setCreatedBy(dto.getCreatedBy());
        gm.setMosqueId(dto.getMosqueId());
        GroupMember saved = groupMemberRepository.save(gm);
        return toMemberDto(saved);
    }

    public void removeMember(Long id) {
        groupMemberRepository.deleteById(id);
    }

    public GroupMemberDTO updateMember(Long id, GroupMemberDTO dto) {
        GroupMember gm = groupMemberRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Group member not found"));
        gm.setRoleInGroup(dto.getRoleInGroup());
        gm.setStartDate(dto.getStartDate());
        gm.setEndDate(dto.getEndDate());
        // Update group role
        if (dto.getGroupRoleId() != null) {
            GroupRole role = groupRoleRepository.findById(dto.getGroupRoleId())
                    .orElseThrow(() -> new IllegalArgumentException("Group role not found"));
            gm.setGroupRole(role);
        } else {
            gm.setGroupRole(null);
        }
        GroupMember saved = groupMemberRepository.save(gm);
        return toMemberDto(saved);
    }

    public List<GroupMemberDTO> listMembers(Long groupId) {
        return groupMemberRepository.findByGroupId(groupId).stream()
                .map(this::toMemberDto)
                .collect(Collectors.toList());
    }

    private GroupDTO toDto(Group g) {
        GroupDTO dto = new GroupDTO();
        dto.setId(g.getId());
        dto.setName(g.getName());
        dto.setDescription(g.getDescription());
        dto.setStartDate(g.getStartDate());
        dto.setEndDate(g.getEndDate());
        dto.setIsActive(g.getIsActive());
        dto.setCreatedBy(g.getCreatedBy());
        dto.setMosqueId(g.getMosqueId());
        dto.setCreatedAt(g.getCreatedAt());

        // Add member count
        dto.setMemberCount(groupMemberRepository.countByGroupId(g.getId()));

        if (g.getTranslations() != null) {
            dto.setTranslations(g.getTranslations().stream()
                    .map(t -> {
                        GroupTranslationDTO tdto = new GroupTranslationDTO();
                        tdto.setId(t.getId());
                        tdto.setLocale(t.getLocale());
                        tdto.setName(t.getName());
                        tdto.setDescription(t.getDescription());
                        return tdto;
                    })
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private GroupMemberDTO toMemberDto(GroupMember gm) {
        GroupMemberDTO dto = new GroupMemberDTO();
        dto.setId(gm.getId());
        dto.setGroupId(gm.getGroup() != null ? gm.getGroup().getId() : null);
        dto.setPersonId(gm.getPerson() != null ? gm.getPerson().getId() : null);
        dto.setStartDate(gm.getStartDate());
        dto.setEndDate(gm.getEndDate());
        dto.setRoleInGroup(gm.getRoleInGroup());
        dto.setCreatedBy(gm.getCreatedBy());
        dto.setMosqueId(gm.getMosqueId());
        dto.setCreatedAt(gm.getCreatedAt());

        // Set group role info
        if (gm.getGroupRole() != null) {
            dto.setGroupRoleId(gm.getGroupRole().getId());
            dto.setRoleName(gm.getGroupRole().getName());
        }

        // Include person name to avoid N+1 frontend calls
        if (gm.getPerson() != null) {
            dto.setPersonFirstName(gm.getPerson().getFirstName());
            dto.setPersonLastName(gm.getPerson().getLastName());
        }

        return dto;
    }

    // ==================== Group Role CRUD ====================

    public GroupRoleDTO createRole(Long groupId, GroupRoleDTO dto) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        GroupRole role = new GroupRole(dto.getName());
        role.setGroup(g);
        role.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        role.setMaxMembers(dto.getMaxMembers());
        role.setIsActive(dto.getIsActive() == null ? true : dto.getIsActive());
        role.setMosqueId(dto.getMosqueId());

        if (dto.getTranslations() != null) {
            for (GroupRoleTranslationDTO tDto : dto.getTranslations()) {
                GroupRoleTranslation translation = new GroupRoleTranslation(tDto.getLocale(), tDto.getName());
                role.addTranslation(translation);
            }
        }

        GroupRole saved = groupRoleRepository.save(role);
        return toRoleDto(saved);
    }

    public List<GroupRoleDTO> listRoles(Long groupId) {
        return groupRoleRepository.findByGroupIdOrderBySortOrderAsc(groupId).stream()
                .map(this::toRoleDto)
                .collect(Collectors.toList());
    }

    public GroupRoleDTO updateRole(Long roleId, GroupRoleDTO dto) {
        GroupRole role = groupRoleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Group role not found"));
        role.setName(dto.getName());
        role.setSortOrder(dto.getSortOrder());
        role.setMaxMembers(dto.getMaxMembers());
        role.setIsActive(dto.getIsActive());

        // Update translations: clear, flush deletes, then re-add
        if (dto.getTranslations() != null) {
            role.getTranslations().clear();
            entityManager.flush();
            for (GroupRoleTranslationDTO tDto : dto.getTranslations()) {
                GroupRoleTranslation translation = new GroupRoleTranslation(tDto.getLocale(), tDto.getName());
                role.addTranslation(translation);
            }
        }

        GroupRole saved = groupRoleRepository.save(role);
        return toRoleDto(saved);
    }

    public void deleteRole(Long roleId) {
        groupRoleRepository.deleteById(roleId);
    }

    private GroupRoleDTO toRoleDto(GroupRole role) {
        GroupRoleDTO dto = new GroupRoleDTO();
        dto.setId(role.getId());
        dto.setGroupId(role.getGroup() != null ? role.getGroup().getId() : null);
        dto.setName(role.getName());
        dto.setSortOrder(role.getSortOrder());
        dto.setMaxMembers(role.getMaxMembers());
        dto.setIsActive(role.getIsActive());
        dto.setMosqueId(role.getMosqueId());
        dto.setCreatedAt(role.getCreatedAt());

        if (role.getTranslations() != null) {
            dto.setTranslations(role.getTranslations().stream()
                    .map(t -> {
                        GroupRoleTranslationDTO tDto = new GroupRoleTranslationDTO();
                        tDto.setId(t.getId());
                        tDto.setLocale(t.getLocale());
                        tDto.setName(t.getName());
                        return tDto;
                    })
                    .collect(Collectors.toList()));
        }

        return dto;
    }
}

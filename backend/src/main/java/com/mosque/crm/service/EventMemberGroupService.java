package com.mosque.crm.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.EventMemberGroupCreateDTO;
import com.mosque.crm.dto.EventMemberGroupDTO;
import com.mosque.crm.dto.EventMemberGroupMemberCreateDTO;
import com.mosque.crm.dto.EventMemberGroupMemberDTO;
import com.mosque.crm.entity.EventMemberGroup;
import com.mosque.crm.entity.EventMemberGroupMember;
import com.mosque.crm.entity.EventRole;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.EventKind;
import com.mosque.crm.repository.EventMemberGroupMemberRepository;
import com.mosque.crm.repository.EventMemberGroupRepository;
import com.mosque.crm.repository.PersonRepository;

@Service
public class EventMemberGroupService {

    private final EventReferenceService eventReferenceService;
    private final EventRoleService eventRoleService;
    private final EventMemberGroupRepository groupRepository;
    private final EventMemberGroupMemberRepository memberRepository;
    private final PersonRepository personRepository;

    public EventMemberGroupService(
            EventReferenceService eventReferenceService,
            EventRoleService eventRoleService,
            EventMemberGroupRepository groupRepository,
            EventMemberGroupMemberRepository memberRepository,
            PersonRepository personRepository) {
        this.eventReferenceService = eventReferenceService;
        this.eventRoleService = eventRoleService;
        this.groupRepository = groupRepository;
        this.memberRepository = memberRepository;
        this.personRepository = personRepository;
    }

    public List<EventMemberGroupDTO> listGroups(EventKind eventKind, Long eventId) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        return groupRepository.findByEventKindAndEventIdOrderByNameAsc(eventKind, eventId)
                .stream().map(this::toGroupDTO).collect(Collectors.toList());
    }

    @Transactional
    public EventMemberGroupDTO createGroup(EventKind eventKind, Long eventId, EventMemberGroupCreateDTO dto) {
        eventReferenceService.validateEventExists(eventKind, eventId);
        EventMemberGroup group = new EventMemberGroup();
        group.setEventKind(eventKind);
        group.setEventId(eventId);
        group.setName(dto.getName());
        group.setDescription(dto.getDescription());
        return toGroupDTO(groupRepository.save(group));
    }

    @Transactional
    public EventMemberGroupDTO updateGroup(Long id, EventMemberGroupCreateDTO dto) {
        EventMemberGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Member group not found: " + id));
        group.setName(dto.getName());
        group.setDescription(dto.getDescription());
        return toGroupDTO(groupRepository.save(group));
    }

    @Transactional
    public void deleteGroup(Long id) {
        memberRepository.deleteByGroupId(id);
        groupRepository.deleteById(id);
    }

    public List<EventMemberGroupMemberDTO> listMembers(Long groupId) {
        return memberRepository.findByGroupIdOrderByPersonLastNameAscPersonFirstNameAsc(groupId)
                .stream().map(this::toMemberDTO).collect(Collectors.toList());
    }

    @Transactional
    public EventMemberGroupMemberDTO addMember(Long groupId, EventMemberGroupMemberCreateDTO dto) {
        EventMemberGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Member group not found: " + groupId));
        if (memberRepository.findByGroupIdAndPersonId(groupId, dto.getPersonId()).isPresent()) {
            throw new RuntimeException("Person is already a member of this group");
        }
        Person person = personRepository.findById(dto.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found: " + dto.getPersonId()));
        EventRole role = eventRoleService.getRoleForEvent(dto.getEventRoleId(), group.getEventKind(), group.getEventId());

        EventMemberGroupMember member = new EventMemberGroupMember();
        member.setGroup(group);
        member.setPerson(person);
        member.setEventRole(role);
        return toMemberDTO(memberRepository.save(member));
    }

    @Transactional
    public EventMemberGroupMemberDTO updateMember(Long groupId, Long memberId, EventMemberGroupMemberCreateDTO dto) {
        EventMemberGroupMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Group member not found: " + memberId));
        if (!member.getGroup().getId().equals(groupId)) {
            throw new RuntimeException("Member does not belong to this group");
        }
        EventRole role = eventRoleService.getRoleForEvent(
                dto.getEventRoleId(), member.getGroup().getEventKind(), member.getGroup().getEventId());
        member.setEventRole(role);
        return toMemberDTO(memberRepository.save(member));
    }

    @Transactional
    public void removeMember(Long groupId, Long memberId) {
        EventMemberGroupMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("Group member not found: " + memberId));
        if (!member.getGroup().getId().equals(groupId)) {
            throw new RuntimeException("Member does not belong to this group");
        }
        memberRepository.delete(member);
    }

    private EventMemberGroupDTO toGroupDTO(EventMemberGroup group) {
        EventMemberGroupDTO dto = new EventMemberGroupDTO();
        dto.setId(group.getId());
        dto.setEventKind(group.getEventKind().name());
        dto.setEventId(group.getEventId());
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        dto.setMemberCount(memberRepository.findByGroupIdOrderByPersonLastNameAscPersonFirstNameAsc(group.getId()).stream().count());
        return dto;
    }

    private EventMemberGroupMemberDTO toMemberDTO(EventMemberGroupMember member) {
        EventMemberGroupMemberDTO dto = new EventMemberGroupMemberDTO();
        dto.setId(member.getId());
        dto.setGroupId(member.getGroup().getId());
        dto.setPersonId(member.getPerson().getId());
        dto.setPersonName(formatPersonName(member.getPerson()));
        dto.setEventRoleId(member.getEventRole().getId());
        dto.setEventRoleName(member.getEventRole().getName());
        return dto;
    }

    private String formatPersonName(Person person) {
        String first = person.getFirstName() != null ? person.getFirstName() : "";
        String last = person.getLastName() != null ? person.getLastName() : "";
        return (first + " " + last).trim();
    }
}

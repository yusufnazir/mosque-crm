package com.mosque.crm.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.EventMemberGroupMember;

public interface EventMemberGroupMemberRepository extends JpaRepository<EventMemberGroupMember, Long> {

    List<EventMemberGroupMember> findByGroupIdOrderByPersonLastNameAscPersonFirstNameAsc(Long groupId);

    Optional<EventMemberGroupMember> findByGroupIdAndPersonId(Long groupId, Long personId);

    long countByEventRoleId(Long eventRoleId);

    void deleteByGroupId(Long groupId);
}

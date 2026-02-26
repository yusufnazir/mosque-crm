package com.mosque.crm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.mosque.crm.entity.GroupRole;

public interface GroupRoleRepository extends JpaRepository<GroupRole, Long> {

    List<GroupRole> findByGroupIdOrderBySortOrderAsc(Long groupId);
}

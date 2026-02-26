package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.GroupDTO;
import com.mosque.crm.dto.GroupMemberDTO;
import com.mosque.crm.dto.GroupRoleDTO;
import com.mosque.crm.service.GroupService;

@RestController
@RequestMapping("/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<GroupDTO> create(@RequestBody GroupDTO dto) {
        GroupDTO created = groupService.createGroup(dto);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<List<GroupDTO>> list() {
        return ResponseEntity.ok(groupService.listGroups());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupDTO> get(@PathVariable Long id) {
        return groupService.getGroup(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<GroupDTO> update(@PathVariable Long id, @RequestBody GroupDTO dto) {
        return ResponseEntity.ok(groupService.updateGroup(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        groupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/members")
    public ResponseEntity<GroupMemberDTO> addMember(@RequestBody GroupMemberDTO dto) {
        return ResponseEntity.ok(groupService.addMember(dto));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<GroupMemberDTO>> listMembers(@PathVariable Long id) {
        return ResponseEntity.ok(groupService.listMembers(id));
    }

    @DeleteMapping("/members/{id}")
    public ResponseEntity<Void> removeMember(@PathVariable Long id) {
        groupService.removeMember(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/members/{id}")
    public ResponseEntity<GroupMemberDTO> updateMember(@PathVariable Long id, @RequestBody GroupMemberDTO dto) {
        return ResponseEntity.ok(groupService.updateMember(id, dto));
    }

    // ==================== Group Roles ====================

    @PostMapping("/{groupId}/roles")
    public ResponseEntity<GroupRoleDTO> createRole(@PathVariable Long groupId, @RequestBody GroupRoleDTO dto) {
        return ResponseEntity.ok(groupService.createRole(groupId, dto));
    }

    @GetMapping("/{groupId}/roles")
    public ResponseEntity<List<GroupRoleDTO>> listRoles(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupService.listRoles(groupId));
    }

    @PutMapping("/roles/{roleId}")
    public ResponseEntity<GroupRoleDTO> updateRole(@PathVariable Long roleId, @RequestBody GroupRoleDTO dto) {
        return ResponseEntity.ok(groupService.updateRole(roleId, dto));
    }

    @DeleteMapping("/roles/{roleId}")
    public ResponseEntity<Void> deleteRole(@PathVariable Long roleId) {
        groupService.deleteRole(roleId);
        return ResponseEntity.noContent().build();
    }
}

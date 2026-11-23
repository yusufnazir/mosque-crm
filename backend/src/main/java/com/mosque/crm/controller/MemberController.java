package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.MemberDTO;
import com.mosque.crm.dto.BulkMemberAccountRequest;
import com.mosque.crm.dto.MemberAccountResultDTO;
import com.mosque.crm.service.BulkMemberAccountService;
import com.mosque.crm.service.MemberService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/admin/members")
public class MemberController {

    private final MemberService memberService;
    private final BulkMemberAccountService bulkMemberAccountService;

    public MemberController(MemberService memberService, BulkMemberAccountService bulkMemberAccountService) {
        this.memberService = memberService;
        this.bulkMemberAccountService = bulkMemberAccountService;
    }

    @GetMapping("/accounts/candidates")
    public ResponseEntity<List<MemberAccountResultDTO>> accountCandidates() {
        return ResponseEntity.ok(bulkMemberAccountService.candidates());
    }

    @PostMapping("/accounts")
    public ResponseEntity<List<MemberAccountResultDTO>> createAccounts(
            @Valid @RequestBody BulkMemberAccountRequest request) {
        return ResponseEntity.ok(bulkMemberAccountService.create(request.getPersonIds()));
    }

    @GetMapping
    public ResponseEntity<List<MemberDTO>> getAllMembers() {
        return ResponseEntity.ok(memberService.getAllMembers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemberDTO> getMemberById(@PathVariable Long id) {
        MemberDTO member = memberService.getMemberById(id);
        if (member == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(member);
    }

    @GetMapping("/search")
    public ResponseEntity<List<MemberDTO>> searchMembers(@RequestParam String keyword) {
        return ResponseEntity.ok(memberService.searchMembers(keyword));
    }

    @PostMapping
    public ResponseEntity<MemberDTO> createMember(@Valid @RequestBody MemberDTO memberDTO) {
        MemberDTO created = memberService.createMember(memberDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MemberDTO> updateMember(
            @PathVariable Long id,
            @Valid @RequestBody MemberDTO memberDTO) {
        return ResponseEntity.ok(memberService.updateMember(id, memberDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMember(@PathVariable Long id) {
        memberService.deleteMember(id);
        return ResponseEntity.noContent().build();
    }
}

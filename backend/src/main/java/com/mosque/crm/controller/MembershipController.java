package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.MembershipCreateDTO;
import com.mosque.crm.dto.MembershipListDTO;
import com.mosque.crm.service.MembershipCreationService;
import com.mosque.crm.service.MembershipListingService;

@RestController
@RequestMapping("/memberships")
public class MembershipController {

    private final MembershipListingService membershipListingService;
    private final MembershipCreationService membershipCreationService;

    public MembershipController(MembershipListingService membershipListingService,
                                MembershipCreationService membershipCreationService) {
        this.membershipListingService = membershipListingService;
        this.membershipCreationService = membershipCreationService;
    }

    @GetMapping
    public ResponseEntity<List<MembershipListDTO>> listActiveMembers() {
        return ResponseEntity.ok(membershipListingService.listActiveMembers());
    }

    @GetMapping("/{personId}")
    public ResponseEntity<MembershipListDTO> getMemberByPersonId(@PathVariable String personId) {
        return ResponseEntity.ok(membershipListingService.getMemberByPersonId(personId));
    }

    @PostMapping
    public ResponseEntity<MembershipListDTO> createMember(@RequestBody MembershipCreateDTO request) {
        return ResponseEntity.ok(membershipCreationService.createMember(request));
    }

    @PutMapping("/{personId}")
    public ResponseEntity<MembershipListDTO> updateMember(@PathVariable String personId,
                                                          @RequestBody MembershipCreateDTO request) {
        return ResponseEntity.ok(membershipCreationService.updateMember(personId, request));
    }
}

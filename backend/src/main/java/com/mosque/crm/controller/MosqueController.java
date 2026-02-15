package com.mosque.crm.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.MosqueDTO;
import com.mosque.crm.entity.Mosque;
import com.mosque.crm.repository.MosqueRepository;

@RestController
@RequestMapping("/mosques")
public class MosqueController {

    private static final Logger log = LoggerFactory.getLogger(MosqueController.class);

    private final MosqueRepository mosqueRepository;

    public MosqueController(MosqueRepository mosqueRepository) {
        this.mosqueRepository = mosqueRepository;
    }

    @GetMapping
    @PreAuthorize("@auth.hasPermission('mosque.manage')")
    public ResponseEntity<List<MosqueDTO>> getAllMosques() {
        List<MosqueDTO> mosques = mosqueRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(mosques);
    }

    @GetMapping("/active")
    public ResponseEntity<List<MosqueDTO>> getActiveMosques() {
        List<MosqueDTO> mosques = mosqueRepository.findByActiveTrue().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(mosques);
    }

    @GetMapping("/{id}")
    @PreAuthorize("@auth.hasPermission('mosque.manage')")
    public ResponseEntity<MosqueDTO> getMosqueById(@PathVariable Long id) {
        return mosqueRepository.findById(id)
                .map(this::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("@auth.hasPermission('mosque.manage')")
    public ResponseEntity<MosqueDTO> createMosque(@RequestBody MosqueDTO dto) {
        if (mosqueRepository.existsByName(dto.getName())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        Mosque mosque = new Mosque();
        mosque.setName(dto.getName());
        mosque.setShortName(dto.getShortName());
        mosque.setAddress(dto.getAddress());
        mosque.setCity(dto.getCity());
        mosque.setCountry(dto.getCountry());
        mosque.setPostalCode(dto.getPostalCode());
        mosque.setPhone(dto.getPhone());
        mosque.setEmail(dto.getEmail());
        mosque.setWebsite(dto.getWebsite());
        mosque.setActive(dto.getActive() != null ? dto.getActive() : true);

        Mosque saved = mosqueRepository.save(mosque);
        log.info("Created mosque: {} (id={})", saved.getName(), saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(saved));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@auth.hasPermission('mosque.manage')")
    public ResponseEntity<MosqueDTO> updateMosque(@PathVariable Long id, @RequestBody MosqueDTO dto) {
        return mosqueRepository.findById(id)
                .map(mosque -> {
                    mosque.setName(dto.getName());
                    mosque.setShortName(dto.getShortName());
                    mosque.setAddress(dto.getAddress());
                    mosque.setCity(dto.getCity());
                    mosque.setCountry(dto.getCountry());
                    mosque.setPostalCode(dto.getPostalCode());
                    mosque.setPhone(dto.getPhone());
                    mosque.setEmail(dto.getEmail());
                    mosque.setWebsite(dto.getWebsite());
                    if (dto.getActive() != null) {
                        mosque.setActive(dto.getActive());
                    }
                    Mosque saved = mosqueRepository.save(mosque);
                    log.info("Updated mosque: {} (id={})", saved.getName(), saved.getId());
                    return ResponseEntity.ok(toDTO(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private MosqueDTO toDTO(Mosque mosque) {
        MosqueDTO dto = new MosqueDTO();
        dto.setId(mosque.getId());
        dto.setName(mosque.getName());
        dto.setShortName(mosque.getShortName());
        dto.setAddress(mosque.getAddress());
        dto.setCity(mosque.getCity());
        dto.setCountry(mosque.getCountry());
        dto.setPostalCode(mosque.getPostalCode());
        dto.setPhone(mosque.getPhone());
        dto.setEmail(mosque.getEmail());
        dto.setWebsite(mosque.getWebsite());
        dto.setActive(mosque.isActive());
        dto.setCreatedAt(mosque.getCreatedAt());
        dto.setUpdatedAt(mosque.getUpdatedAt());
        return dto;
    }
}

package com.mosque.crm.controller;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.service.BusinessDirectoryService;
import com.mosque.crm.service.BusinessDirectoryService.StoredImage;

/**
 * Anonymous public business-directory endpoints.
 * Plan gating is enforced in {@link BusinessDirectoryService} against the host org from {@code orgHandle}
 * (not via {@code @PlanFeatureRequired}, which uses the caller's tenant and bypasses when unauthenticated).
 */
@RestController
@RequestMapping("/business-directory")
public class PublicBusinessDirectoryController {

    private final BusinessDirectoryService businessDirectoryService;

    public PublicBusinessDirectoryController(BusinessDirectoryService businessDirectoryService) {
        this.businessDirectoryService = businessDirectoryService;
    }

    @GetMapping("/public/{orgHandle}")
    public ResponseEntity<?> listPublic(
            @PathVariable String orgHandle,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        try {
            return ResponseEntity.ok(
                    businessDirectoryService.listPublicDirectory(orgHandle, page, size, search, category));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/public/{orgHandle}/sitemap-entries")
    public ResponseEntity<?> listPublicSitemapEntries(@PathVariable String orgHandle) {
        try {
            return ResponseEntity.ok(businessDirectoryService.listPublicSitemapEntries(orgHandle));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/public/{orgHandle}/{id}")
    public ResponseEntity<?> getPublicBusiness(@PathVariable String orgHandle, @PathVariable Long id) {
        try {
            return ResponseEntity.ok(businessDirectoryService.getPublicBusiness(orgHandle, id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/public/{orgHandle}/{id}/logo")
    public ResponseEntity<?> getPublicLogo(@PathVariable String orgHandle, @PathVariable Long id) {
        try {
            StoredImage image = businessDirectoryService.getPublicLogo(orgHandle, id);
            if (image == null) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, image.contentType() != null
                            ? image.contentType()
                            : MediaType.APPLICATION_OCTET_STREAM_VALUE)
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                    .body(image.bytes());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.notFound().build();
        }
    }
}

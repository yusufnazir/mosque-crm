package com.mosque.crm.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

import com.mosque.crm.dto.BusinessDTO;
import com.mosque.crm.dto.BusinessDirectoryPageResponse;
import com.mosque.crm.dto.BusinessListingDTO;
import com.mosque.crm.dto.BusinessReviewDTO;
import com.mosque.crm.dto.FederatedBusinessListingDTO;
import com.mosque.crm.service.BusinessDirectoryService;
import com.mosque.crm.service.BusinessDirectoryService.StoredImage;
import com.mosque.crm.subscription.FeatureKeys;
import com.mosque.crm.subscription.PlanFeatureRequired;

@PlanFeatureRequired(FeatureKeys.BUSINESS_DIRECTORY)
@RestController
@RequestMapping("/business-directory")
public class BusinessDirectoryController {

    private final BusinessDirectoryService businessDirectoryService;

    public BusinessDirectoryController(BusinessDirectoryService businessDirectoryService) {
        this.businessDirectoryService = businessDirectoryService;
    }

    @GetMapping
    public ResponseEntity<List<BusinessDTO>> listLocal() {
        return ResponseEntity.ok(businessDirectoryService.listLocalBusinesses());
    }

    @GetMapping("/my")
    public ResponseEntity<?> listMy() {
        try {
            return ResponseEntity.ok(businessDirectoryService.listMyBusinesses());
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @GetMapping("/pending-approval")
    public ResponseEntity<List<BusinessDTO>> listPendingApproval() {
        return ResponseEntity.ok(businessDirectoryService.listPendingApprovals());
    }

    @GetMapping("/published")
    public ResponseEntity<List<BusinessDTO>> listPublished() {
        return ResponseEntity.ok(businessDirectoryService.listPublishedBusinesses());
    }

    @GetMapping("/published/page")
    public ResponseEntity<BusinessDirectoryPageResponse<BusinessDTO>> listPublishedPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(
                businessDirectoryService.listPublishedBusinessesPaged(page, size, search, category));
    }

    @GetMapping("/federation")
    public ResponseEntity<List<FederatedBusinessListingDTO>> listFederation() {
        return ResponseEntity.ok(businessDirectoryService.listFederationDirectory());
    }

    @GetMapping("/federation/page")
    public ResponseEntity<BusinessDirectoryPageResponse<FederatedBusinessListingDTO>> listFederationPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(
                businessDirectoryService.listFederationDirectoryPaged(page, size, search, category));
    }

    @GetMapping("/usage")
    public ResponseEntity<Map<String, Object>> usage() {
        return ResponseEntity.ok(businessDirectoryService.getListingUsage());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(businessDirectoryService.getBusiness(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody BusinessDTO dto) {
        try {
            return ResponseEntity.ok(businessDirectoryService.createBusiness(dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @PostMapping("/my")
    public ResponseEntity<?> createMy(@RequestBody BusinessDTO dto) {
        try {
            return ResponseEntity.ok(businessDirectoryService.createMyBusiness(dto));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @PutMapping("/my/{id}")
    public ResponseEntity<?> updateMy(@PathVariable Long id, @RequestBody BusinessDTO dto) {
        try {
            return ResponseEntity.ok(businessDirectoryService.updateMyBusiness(id, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @PostMapping("/my/{id}/submit")
    public ResponseEntity<?> submitMy(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(businessDirectoryService.submitMyBusinessForApproval(id));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(errorBody(e.getMessage()));
        }
    }

    @DeleteMapping("/my/{id}")
    public ResponseEntity<Void> deleteMy(@PathVariable Long id) {
        businessDirectoryService.deleteMyBusiness(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/my/{id}/listing")
    public ResponseEntity<?> updateMyListing(@PathVariable Long id, @RequestBody BusinessListingDTO dto) {
        try {
            return ResponseEntity.ok(businessDirectoryService.updateMyListing(id, dto));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(businessDirectoryService.approveBusiness(id));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(errorBody(e.getMessage()));
        }
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, @RequestBody(required = false) BusinessReviewDTO dto) {
        try {
            String reason = dto != null ? dto.getReason() : null;
            return ResponseEntity.ok(businessDirectoryService.rejectBusiness(id, reason));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(errorBody(e.getMessage()));
        }
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<?> suspend(@PathVariable Long id, @RequestBody(required = false) BusinessReviewDTO dto) {
        try {
            String reason = dto != null ? dto.getReason() : null;
            return ResponseEntity.ok(businessDirectoryService.suspendBusiness(id, reason));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(errorBody(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).body(errorBody(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody BusinessDTO dto) {
        try {
            return ResponseEntity.ok(businessDirectoryService.updateBusiness(id, dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).body(errorBody(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            businessDirectoryService.deleteBusiness(id);
            return ResponseEntity.noContent().build();
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(403).body(errorBody(e.getMessage()));
        }
    }

    @PutMapping("/{id}/listing")
    public ResponseEntity<?> updateListing(@PathVariable Long id, @RequestBody BusinessListingDTO dto) {
        try {
            return ResponseEntity.ok(businessDirectoryService.updateListing(id, dto));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @PostMapping("/federation/{listingId}/hide")
    public ResponseEntity<?> hideFromFederation(@PathVariable Long listingId, @RequestBody(required = false) BusinessReviewDTO dto) {
        try {
            String reason = dto != null ? dto.getReason() : null;
            return ResponseEntity.ok(businessDirectoryService.hideFromFederation(listingId, reason));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @PostMapping("/federation/{listingId}/unhide")
    public ResponseEntity<?> unhideFromFederation(@PathVariable Long listingId) {
        try {
            return ResponseEntity.ok(businessDirectoryService.unhideFromFederation(listingId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @PostMapping("/my/{id}/logo")
    public ResponseEntity<?> uploadMyLogo(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            String imageUrl = businessDirectoryService.uploadMyLogo(id, file);
            return ResponseEntity.ok(Map.of("message", "Logo uploaded successfully", "imageUrl", imageUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.internalServerError().body(errorBody(e.getMessage()));
        }
    }

    @DeleteMapping("/my/{id}/logo")
    public ResponseEntity<?> deleteMyLogo(@PathVariable Long id) {
        try {
            businessDirectoryService.deleteMyLogo(id);
            return ResponseEntity.ok(Map.of("message", "Logo deleted"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @PostMapping("/{id}/logo")
    public ResponseEntity<?> uploadAdminLogo(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            String imageUrl = businessDirectoryService.uploadAdminLogo(id, file);
            return ResponseEntity.ok(Map.of("message", "Logo uploaded successfully", "imageUrl", imageUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.internalServerError().body(errorBody(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/logo")
    public ResponseEntity<?> deleteAdminLogo(@PathVariable Long id) {
        try {
            businessDirectoryService.deleteAdminLogo(id);
            return ResponseEntity.ok(Map.of("message", "Logo deleted"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(errorBody(e.getMessage()));
        }
    }

    @GetMapping("/{id}/logo")
    public ResponseEntity<?> getLogo(@PathVariable Long id) {
        try {
            StoredImage image = businessDirectoryService.getLogo(id);
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
        }
    }

    private Map<String, String> errorBody(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }
}

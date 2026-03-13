package com.mosque.crm.controller;

import com.mosque.crm.config.StorageProperties;
import com.mosque.crm.entity.Person;
import com.mosque.crm.entity.User;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.service.StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for profile-image upload, download and deletion.
 * Images are stored in MinIO (S3-compatible) and served through the backend — no direct MinIO URLs.
 */
@RestController
@RequestMapping("/profile-image")
public class ProfileImageController {

    private static final Logger log = LoggerFactory.getLogger(ProfileImageController.class);

    private final StorageService storageService;
    private final StorageProperties storageProperties;
    private final UserRepository userRepository;
    private final PersonRepository personRepository;

    public ProfileImageController(StorageService storageService,
                                  StorageProperties storageProperties,
                                  UserRepository userRepository,
                                  PersonRepository personRepository) {
        this.storageService = storageService;
        this.storageProperties = storageProperties;
        this.userRepository = userRepository;
        this.personRepository = personRepository;
    }

    // ── Upload / replace ─────────────────────────────────────────

    /**
     * Upload or replace the current user's own profile image.
     */
    @PostMapping("/me")
    public ResponseEntity<?> uploadMyProfileImage(@RequestParam("file") MultipartFile file) {
        Person person = resolveCurrentPerson();
        if (person == null) {
            return ResponseEntity.status(403).body(Map.of("error", "No person profile linked to current user"));
        }
        return handleUpload(person, file);
    }

    /**
     * Admin upload: set the profile image for any person.
     */
    @PostMapping("/persons/{personId}")
    public ResponseEntity<?> uploadProfileImageForPerson(@PathVariable Long personId,
                                                          @RequestParam("file") MultipartFile file) {
        Person person = personRepository.findById(personId).orElse(null);
        if (person == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Person not found"));
        }
        return handleUpload(person, file);
    }

    // ── Download ────────────────────────────────────────────────

    /**
     * Get the current user's own profile image (binary).
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfileImage() {
        Person person = resolveCurrentPerson();
        if (person == null) {
            return ResponseEntity.status(403).body(Map.of("error", "No person profile linked to current user"));
        }
        return serveImage(person);
    }

    /**
     * Get any person's profile image by personId (used by admin views, member lists, etc.).
     */
    @GetMapping("/persons/{personId}")
    public ResponseEntity<?> getProfileImageForPerson(@PathVariable Long personId) {
        Person person = personRepository.findById(personId).orElse(null);
        if (person == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Person not found"));
        }
        return serveImage(person);
    }

    // ── Delete ──────────────────────────────────────────────────

    /**
     * Delete the current user's own profile image.
     */
    @DeleteMapping("/me")
    public ResponseEntity<?> deleteMyProfileImage() {
        Person person = resolveCurrentPerson();
        if (person == null) {
            return ResponseEntity.status(403).body(Map.of("error", "No person profile linked to current user"));
        }
        return handleDelete(person);
    }

    /**
     * Admin delete: remove profile image for any person.
     */
    @DeleteMapping("/persons/{personId}")
    public ResponseEntity<?> deleteProfileImageForPerson(@PathVariable Long personId) {
        Person person = personRepository.findById(personId).orElse(null);
        if (person == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Person not found"));
        }
        return handleDelete(person);
    }

    // ═══════════════════════════════════════════════════════════
    //  Private helpers
    // ═══════════════════════════════════════════════════════════

    private ResponseEntity<?> handleUpload(Person person, MultipartFile file) {
        // Validate file
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }

        String contentType = file.getContentType();
        List<String> allowed = storageProperties.getProfileImage().getAllowedTypes();
        if (contentType == null || !allowed.contains(contentType)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "File type not allowed. Accepted: " + String.join(", ", allowed)));
        }

        long maxBytes = storageProperties.getProfileImage().getMaxSizeMb() * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "File exceeds maximum size of " + storageProperties.getProfileImage().getMaxSizeMb() + " MB"));
        }

        try {
            // Delete old image if exists
            if (person.getProfileImageKey() != null) {
                try {
                    storageService.delete(person.getProfileImageKey());
                } catch (Exception e) {
                    log.warn("Failed to delete old profile image for person {}: {}", person.getId(), e.getMessage());
                }
            }

            // Build unique object key
            String extension = getExtension(file.getOriginalFilename(), contentType);
            String key = "profile-images/" + person.getId() + "/" + UUID.randomUUID() + extension;

            storageService.upload(key, file.getInputStream(), contentType, file.getSize());

            // Persist key on person
            person.setProfileImageKey(key);
            personRepository.save(person);

            log.info("Profile image uploaded for person {}: {}", person.getId(), key);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile image uploaded successfully");
            response.put("imageUrl", "/api/profile-image/persons/" + person.getId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to upload profile image for person {}: {}", person.getId(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    private ResponseEntity<?> serveImage(Person person) {
        if (person.getProfileImageKey() == null) {
            return ResponseEntity.noContent().build();
        }
        try {
            ResponseInputStream<GetObjectResponse> response = storageService.download(person.getProfileImageKey());
            GetObjectResponse metadata = response.response();

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, metadata.contentType())
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
                    .body(response.readAllBytes());
        } catch (Exception e) {
            log.error("Failed to serve profile image for person {}: {}", person.getId(), e.getMessage());
            return ResponseEntity.noContent().build();
        }
    }

    private ResponseEntity<?> handleDelete(Person person) {
        if (person.getProfileImageKey() == null) {
            return ResponseEntity.ok(Map.of("message", "No profile image to delete"));
        }
        try {
            storageService.delete(person.getProfileImageKey());
        } catch (Exception e) {
            log.warn("Failed to delete object from storage for person {}: {}", person.getId(), e.getMessage());
        }
        person.setProfileImageKey(null);
        personRepository.save(person);
        log.info("Profile image deleted for person {}", person.getId());
        return ResponseEntity.ok(Map.of("message", "Profile image deleted"));
    }

    private Person resolveCurrentPerson() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        User user = userRepository.findByUsername(auth.getName()).orElse(null);
        if (user == null || user.getPerson() == null) {
            return null;
        }
        return user.getPerson();
    }

    private String getExtension(String originalFilename, String contentType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf('.'));
        }
        // Fallback from content type
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }
}

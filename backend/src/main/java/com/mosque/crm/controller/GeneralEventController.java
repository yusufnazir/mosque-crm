package com.mosque.crm.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
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

import com.mosque.crm.dto.GeneralEventAttendanceCreateDTO;
import com.mosque.crm.dto.GeneralEventAttendanceDTO;
import com.mosque.crm.dto.GeneralEventCreateDTO;
import com.mosque.crm.dto.GeneralEventDTO;
import com.mosque.crm.dto.GeneralEventDocumentDTO;
import com.mosque.crm.dto.GeneralEventRegistrationCreateDTO;
import com.mosque.crm.dto.GeneralEventRegistrationDTO;
import com.mosque.crm.dto.GeneralEventReportDTO;
import com.mosque.crm.dto.GeneralEventSessionCreateDTO;
import com.mosque.crm.dto.GeneralEventSessionDTO;
import com.mosque.crm.dto.GeneralEventVolunteerCreateDTO;
import com.mosque.crm.dto.GeneralEventVolunteerDTO;
import com.mosque.crm.entity.GeneralEventDocument;
import com.mosque.crm.service.GeneralEventAttendanceService;
import com.mosque.crm.service.GeneralEventDocumentService;
import com.mosque.crm.service.GeneralEventService;
import com.mosque.crm.service.GeneralEventSessionService;
import com.mosque.crm.service.StorageService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/general-events")
@CrossOrigin(origins = "*")
public class GeneralEventController {

    private final GeneralEventService generalEventService;
    private final GeneralEventSessionService sessionService;
    private final GeneralEventAttendanceService attendanceService;
    private final GeneralEventDocumentService documentService;
    private final StorageService storageService;

    public GeneralEventController(GeneralEventService generalEventService,
            GeneralEventSessionService sessionService,
            GeneralEventAttendanceService attendanceService,
            GeneralEventDocumentService documentService,
            StorageService storageService) {
        this.generalEventService = generalEventService;
        this.sessionService = sessionService;
        this.attendanceService = attendanceService;
        this.documentService = documentService;
        this.storageService = storageService;
    }

    // ========================
    // Events
    // ========================

    @GetMapping
    public ResponseEntity<List<GeneralEventDTO>> listEvents() {
        return ResponseEntity.ok(generalEventService.listEvents());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEvent(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(generalEventService.getEvent(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createEvent(@Valid @RequestBody GeneralEventCreateDTO dto) {
        try {
            GeneralEventDTO result = generalEventService.createEvent(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable Long id, @Valid @RequestBody GeneralEventCreateDTO dto) {
        try {
            return ResponseEntity.ok(generalEventService.updateEvent(id, dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateEventStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            return ResponseEntity.ok(generalEventService.updateEventStatus(id, status));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long id) {
        try {
            generalEventService.deleteEvent(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<?> getReport(@PathVariable Long id) {
        try {
            GeneralEventReportDTO result = generalEventService.getReport(id);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ========================
    // Registrations
    // ========================

    @GetMapping("/{id}/registrations")
    public ResponseEntity<List<GeneralEventRegistrationDTO>> listRegistrations(@PathVariable Long id) {
        return ResponseEntity.ok(generalEventService.listRegistrations(id));
    }

    @PostMapping("/{id}/registrations")
    public ResponseEntity<?> addRegistration(@PathVariable Long id, @Valid @RequestBody GeneralEventRegistrationCreateDTO dto) {
        try {
            dto.setGeneralEventId(id);
            GeneralEventRegistrationDTO result = generalEventService.addRegistration(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/registrations/{regId}")
    public ResponseEntity<?> updateRegistration(@PathVariable Long id, @PathVariable Long regId, @RequestBody GeneralEventRegistrationCreateDTO dto) {
        try {
            dto.setGeneralEventId(id);
            return ResponseEntity.ok(generalEventService.updateRegistration(regId, dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/registrations/{regId}/check-in")
    public ResponseEntity<?> checkIn(@PathVariable Long id, @PathVariable Long regId) {
        try {
            return ResponseEntity.ok(generalEventService.checkIn(regId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/registrations/{regId}")
    public ResponseEntity<?> deleteRegistration(@PathVariable Long id, @PathVariable Long regId) {
        try {
            generalEventService.deleteRegistration(regId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========================
    // Volunteers
    // ========================

    @GetMapping("/{id}/volunteers")
    public ResponseEntity<List<GeneralEventVolunteerDTO>> listVolunteers(@PathVariable Long id) {
        return ResponseEntity.ok(generalEventService.listVolunteers(id));
    }

    @PostMapping("/{id}/volunteers")
    public ResponseEntity<?> addVolunteer(@PathVariable Long id, @Valid @RequestBody GeneralEventVolunteerCreateDTO dto) {
        try {
            dto.setGeneralEventId(id);
            GeneralEventVolunteerDTO result = generalEventService.addVolunteer(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/volunteers/{volId}")
    public ResponseEntity<?> updateVolunteer(@PathVariable Long id, @PathVariable Long volId, @RequestBody GeneralEventVolunteerCreateDTO dto) {
        try {
            dto.setGeneralEventId(id);
            return ResponseEntity.ok(generalEventService.updateVolunteer(volId, dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/volunteers/{volId}")
    public ResponseEntity<?> deleteVolunteer(@PathVariable Long id, @PathVariable Long volId) {
        try {
            generalEventService.deleteVolunteer(volId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========================
    // Sessions
    // ========================

    @GetMapping("/{id}/sessions")
    public ResponseEntity<List<GeneralEventSessionDTO>> listSessions(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.listSessions(id));
    }

    @PostMapping("/{id}/sessions")
    public ResponseEntity<?> createSession(@PathVariable Long id,
            @Valid @RequestBody GeneralEventSessionCreateDTO dto) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(sessionService.createSession(id, dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/sessions/{sessionId}")
    public ResponseEntity<?> updateSession(@PathVariable Long id, @PathVariable Long sessionId,
            @RequestBody GeneralEventSessionCreateDTO dto) {
        try {
            return ResponseEntity.ok(sessionService.updateSession(sessionId, dto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/sessions/{sessionId}")
    public ResponseEntity<?> deleteSession(@PathVariable Long id, @PathVariable Long sessionId) {
        try {
            sessionService.deleteSession(sessionId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========================
    // Attendance
    // ========================

    @GetMapping("/{id}/sessions/{sessionId}/attendance")
    public ResponseEntity<List<GeneralEventAttendanceDTO>> listAttendance(
            @PathVariable Long id, @PathVariable Long sessionId) {
        return ResponseEntity.ok(attendanceService.listAttendance(id, sessionId));
    }

    @PostMapping("/{id}/sessions/{sessionId}/attendance/prepopulate")
    public ResponseEntity<?> prepopulateAttendance(@PathVariable Long id, @PathVariable Long sessionId) {
        try {
            int count = attendanceService.prepopulateFromRegistrations(id, sessionId);
            return ResponseEntity.ok(Map.of("created", count));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/sessions/{sessionId}/attendance")
    public ResponseEntity<?> markAttendance(@PathVariable Long id, @PathVariable Long sessionId,
            @RequestBody GeneralEventAttendanceCreateDTO dto, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(attendanceService.markAttendance(id, sessionId, dto, userId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/sessions/{sessionId}/attendance/bulk")
    public ResponseEntity<?> bulkMarkAttendance(@PathVariable Long id, @PathVariable Long sessionId,
            @RequestBody List<GeneralEventAttendanceCreateDTO> items, HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            int count = attendanceService.bulkMark(id, sessionId, items, userId);
            return ResponseEntity.ok(Map.of("updated", count));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}/sessions/{sessionId}/attendance/{attId}")
    public ResponseEntity<?> deleteAttendance(@PathVariable Long id, @PathVariable Long sessionId,
            @PathVariable Long attId) {
        try {
            attendanceService.deleteAttendance(attId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========================
    // Documents
    // ========================

    @GetMapping("/{id}/documents")
    public ResponseEntity<List<GeneralEventDocumentDTO>> listDocuments(
            @PathVariable Long id,
            @RequestParam(required = false) Long sessionId) {
        return ResponseEntity.ok(documentService.listDocuments(id, sessionId));
    }

    @PostMapping(value = "/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long sessionId,
            @RequestParam(required = false) String description,
            HttpServletRequest request) {
        try {
            Long userId = (Long) request.getAttribute("userId");
            GeneralEventDocumentDTO result = documentService.uploadDocument(id, sessionId, description, file, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/documents/{docId}/download")
    public ResponseEntity<?> downloadDocument(
            @PathVariable Long id,
            @PathVariable Long docId) {
        try {
            GeneralEventDocument doc = documentService.getDocumentEntity(docId);
            software.amazon.awssdk.core.ResponseInputStream<software.amazon.awssdk.services.s3.model.GetObjectResponse> response =
                    storageService.download(doc.getStorageKey());
            String contentType = doc.getContentType() != null ? doc.getContentType() : response.response().contentType();
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getFileName() + "\"")
                    .body(response.readAllBytes());
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}/documents/{docId}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id, @PathVariable Long docId) {
        try {
            documentService.deleteDocument(docId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}


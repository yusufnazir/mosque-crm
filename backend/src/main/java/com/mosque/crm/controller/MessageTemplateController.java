package com.mosque.crm.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.MessageTemplateDTO;
import com.mosque.crm.dto.MessageTemplatePlaceholderDTO;
import com.mosque.crm.dto.MessageTemplatePreviewDTO;
import com.mosque.crm.dto.MessageTemplatePreviewResultDTO;
import com.mosque.crm.dto.MessageTemplateTestRequestDTO;
import com.mosque.crm.dto.MessageTemplateUpdateDTO;
import com.mosque.crm.service.AuthorizationService;
import com.mosque.crm.service.MessageTemplateService;

/**
 * Organization message templates (Settings → Message templates).
 *
 * Tenants edit the text used for transactional notifications such as "membership request
 * approved" or "membership request rejected", per language and per channel (email or WhatsApp).
 */
@RestController
@RequestMapping("/message-templates")
public class MessageTemplateController {

    private static final String PERMISSION_VIEW = "message_template.view";
    private static final String PERMISSION_MANAGE = "message_template.manage";

    private final MessageTemplateService messageTemplateService;
    private final AuthorizationService authorizationService;

    public MessageTemplateController(MessageTemplateService messageTemplateService,
                                     AuthorizationService authorizationService) {
        this.messageTemplateService = messageTemplateService;
        this.authorizationService = authorizationService;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        if (!authorizationService.hasPermission(PERMISSION_VIEW)) {
            return forbidden();
        }
        List<MessageTemplateDTO> templates = messageTemplateService.listForCurrentTenant();
        return ResponseEntity.ok(templates);
    }

    @GetMapping("/languages")
    public ResponseEntity<?> languages() {
        if (!authorizationService.hasPermission(PERMISSION_VIEW)) {
            return forbidden();
        }
        return ResponseEntity.ok(messageTemplateService.supportedLanguages());
    }

    @GetMapping("/{templateKey}")
    public ResponseEntity<?> get(@PathVariable String templateKey,
                                 @RequestParam(name = "language", defaultValue = "en") String language) {
        if (!authorizationService.hasPermission(PERMISSION_VIEW)) {
            return forbidden();
        }
        try {
            return ResponseEntity.ok(messageTemplateService.getForCurrentTenant(templateKey, language));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    @GetMapping("/{templateKey}/placeholders")
    public ResponseEntity<?> placeholders(@PathVariable String templateKey) {
        if (!authorizationService.hasPermission(PERMISSION_VIEW)) {
            return forbidden();
        }
        try {
            return ResponseEntity.ok(messageTemplateService.placeholders(templateKey));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    @PutMapping("/{templateKey}")
    public ResponseEntity<?> update(@PathVariable String templateKey,
                                    @RequestParam(name = "language", defaultValue = "en") String language,
                                    @RequestBody MessageTemplateUpdateDTO dto) {
        if (!authorizationService.hasPermission(PERMISSION_MANAGE)) {
            return forbidden();
        }
        try {
            return ResponseEntity.ok(messageTemplateService.updateForCurrentTenant(templateKey, language, dto));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    @PostMapping("/{templateKey}/reset")
    public ResponseEntity<?> reset(@PathVariable String templateKey,
                                   @RequestParam(name = "language", defaultValue = "en") String language) {
        if (!authorizationService.hasPermission(PERMISSION_MANAGE)) {
            return forbidden();
        }
        try {
            return ResponseEntity.ok(messageTemplateService.resetForCurrentTenant(templateKey, language));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    @PostMapping("/{templateKey}/preview")
    public ResponseEntity<?> preview(@PathVariable String templateKey,
                                     @RequestBody(required = false) MessageTemplatePreviewDTO dto) {
        if (!authorizationService.hasPermission(PERMISSION_VIEW)) {
            return forbidden();
        }
        try {
            MessageTemplatePreviewResultDTO result = messageTemplateService.preview(
                    templateKey, dto == null ? new MessageTemplatePreviewDTO() : dto);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    @PostMapping("/{templateKey}/test")
    public ResponseEntity<?> sendTest(@PathVariable String templateKey,
                                      @RequestBody(required = false) MessageTemplateTestRequestDTO dto) {
        if (!authorizationService.hasPermission(PERMISSION_MANAGE)) {
            return forbidden();
        }
        try {
            return ResponseEntity.ok(messageTemplateService.sendTest(
                    templateKey, dto == null ? new MessageTemplateTestRequestDTO() : dto));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    private ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "You do not have permission to manage message templates."));
    }
}

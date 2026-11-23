package com.mosque.crm.controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mosque.crm.dto.ScheduledJobDTO;
import com.mosque.crm.scheduler.SchedulerService;
import com.mosque.crm.service.AuthorizationService;

/**
 * Platform-wide scheduler management.
 *
 * Every background job the application runs is listed here and can be reconfigured, paused,
 * resumed or triggered by hand. Changes are applied to the live runtime immediately — a
 * restart is never required.
 */
@RestController
@RequestMapping("/schedulers")
public class SchedulerController {

    private static final Logger log = LoggerFactory.getLogger(SchedulerController.class);

    private final SchedulerService schedulerService;
    private final AuthorizationService authorizationService;

    public SchedulerController(SchedulerService schedulerService,
                               AuthorizationService authorizationService) {
        this.schedulerService = schedulerService;
        this.authorizationService = authorizationService;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        if (!authorizationService.hasPermission("scheduler.view")) {
            return forbidden("You need the scheduler.view permission to see the schedulers.");
        }
        List<ScheduledJobDTO> jobs = schedulerService.list();
        return ResponseEntity.ok(jobs);
    }

    @GetMapping("/{key}")
    public ResponseEntity<?> get(@PathVariable String key) {
        if (!authorizationService.hasPermission("scheduler.view")) {
            return forbidden("You need the scheduler.view permission to see the schedulers.");
        }
        try {
            return ResponseEntity.ok(schedulerService.get(key));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    /** Saves the settings and applies them immediately (reschedules or stops the job). */
    @PutMapping("/{key}")
    public ResponseEntity<?> update(@PathVariable String key,
                                    @RequestBody ScheduledJobDTO dto,
                                    Principal principal) {
        if (!authorizationService.hasPermission("scheduler.manage")) {
            return forbidden("You need the scheduler.manage permission to change a scheduler.");
        }
        try {
            return ResponseEntity.ok(schedulerService.update(key, dto, username(principal)));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{key}/start")
    public ResponseEntity<?> start(@PathVariable String key, Principal principal) {
        if (!authorizationService.hasPermission("scheduler.manage")) {
            return forbidden("You need the scheduler.manage permission to start a scheduler.");
        }
        try {
            return ResponseEntity.ok(schedulerService.start(key, username(principal)));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return badRequest(e);
        }
    }

    @PostMapping("/{key}/stop")
    public ResponseEntity<?> stop(@PathVariable String key, Principal principal) {
        if (!authorizationService.hasPermission("scheduler.manage")) {
            return forbidden("You need the scheduler.manage permission to stop a scheduler.");
        }
        try {
            return ResponseEntity.ok(schedulerService.stop(key, username(principal)));
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    /** Runs the job once now; the schedule itself is untouched. */
    @PostMapping("/{key}/run")
    public ResponseEntity<?> runNow(@PathVariable String key) {
        if (!authorizationService.hasPermission("scheduler.manage")) {
            return forbidden("You need the scheduler.manage permission to run a scheduler now.");
        }
        try {
            ScheduledJobDTO dto = schedulerService.runNow(key);
            log.info("Scheduler '{}' triggered manually", key);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return badRequest(e);
        }
    }

    private String username(Principal principal) {
        return principal != null && principal.getName() != null ? principal.getName() : "system";
    }

    private ResponseEntity<Map<String, String>> badRequest(Exception e) {
        Map<String, String> error = new HashMap<>();
        error.put("error", e.getMessage());
        return ResponseEntity.badRequest().body(error);
    }

    private ResponseEntity<Map<String, String>> forbidden(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return ResponseEntity.status(403).body(error);
    }
}

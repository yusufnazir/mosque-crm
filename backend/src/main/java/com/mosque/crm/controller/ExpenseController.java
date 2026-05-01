package com.mosque.crm.controller;

import com.mosque.crm.dto.ExpenseAuditEventDTO;
import com.mosque.crm.dto.ExpenseCreateDTO;
import com.mosque.crm.dto.ExpenseDTO;
import com.mosque.crm.dto.ExpenseDeleteDTO;
import com.mosque.crm.dto.ExpenseMonthlySummaryDTO;
import com.mosque.crm.dto.ExpenseTagCreateDTO;
import com.mosque.crm.dto.ExpenseTagDTO;
import com.mosque.crm.service.ExpenseService;
import org.springframework.data.domain.Page;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/expenses")
@CrossOrigin(origins = "*")
public class ExpenseController {

    private static final Logger log = LoggerFactory.getLogger(ExpenseController.class);

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(defaultValue = "false") boolean includeDeleted) {
        try {
            List<ExpenseDTO> result = expenseService.list(dateFrom, dateTo, tagIds, includeDeleted);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error listing expenses", e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(expenseService.getById(id));
        } catch (Exception e) {
            log.error("Error fetching expense {}", id, e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ExpenseCreateDTO dto) {
        try {
            return ResponseEntity.ok(expenseService.create(dto));
        } catch (Exception e) {
            log.error("Error creating expense", e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ExpenseCreateDTO dto) {
        try {
            return ResponseEntity.ok(expenseService.update(id, dto));
        } catch (Exception e) {
            log.error("Error updating expense {}", id, e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/delete")
    public ResponseEntity<?> softDelete(@PathVariable Long id, @RequestBody ExpenseDeleteDTO dto) {
        try {
            expenseService.softDelete(id, dto.getReason());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error deleting expense {}", id, e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<?> restore(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(expenseService.restore(id));
        } catch (Exception e) {
            log.error("Error restoring expense {}", id, e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/tags")
    public ResponseEntity<?> listTags() {
        try {
            List<ExpenseTagDTO> tags = expenseService.listTags();
            return ResponseEntity.ok(tags);
        } catch (Exception e) {
            log.error("Error listing expense tags", e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @PostMapping("/tags")
    public ResponseEntity<?> createTag(@RequestBody ExpenseTagCreateDTO dto) {
        try {
            return ResponseEntity.ok(expenseService.createTag(dto));
        } catch (Exception e) {
            log.error("Error creating expense tag", e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<?> getAuditLog(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Page<ExpenseAuditEventDTO> events = expenseService.getAuditLog(id, page, size);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            log.error("Error fetching audit log for expense {}", id, e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/monthly-summary")
    public ResponseEntity<?> getMonthlySummary(
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year) {
        try {
            List<ExpenseMonthlySummaryDTO> summary = expenseService.getMonthlySummary(year);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            log.error("Error fetching monthly expense summary for year {}", year, e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }
}

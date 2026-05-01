package com.mosque.crm.service;

import com.mosque.crm.dto.ExpenseAuditEventDTO;
import com.mosque.crm.dto.ExpenseCreateDTO;
import com.mosque.crm.dto.ExpenseDTO;
import com.mosque.crm.dto.ExpenseMonthlySummaryDTO;
import com.mosque.crm.dto.ExpenseTagCreateDTO;
import com.mosque.crm.dto.ExpenseTagDTO;
import com.mosque.crm.entity.Currency;
import com.mosque.crm.entity.Expense;
import com.mosque.crm.entity.ExpenseTag;
import com.mosque.crm.enums.ExpenseAuditEventType;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.CurrencyRepository;
import com.mosque.crm.repository.ExpenseRepository;
import com.mosque.crm.repository.ExpenseTagRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    private static final Logger log = LoggerFactory.getLogger(ExpenseService.class);

    private final ExpenseRepository expenseRepository;
    private final ExpenseTagRepository tagRepository;
    private final CurrencyRepository currencyRepository;
    private final ExpenseAuditService auditService;
    private final AuthorizationService authorizationService;

    public ExpenseService(ExpenseRepository expenseRepository,
                          ExpenseTagRepository tagRepository,
                          CurrencyRepository currencyRepository,
                          ExpenseAuditService auditService,
                          AuthorizationService authorizationService) {
        this.expenseRepository = expenseRepository;
        this.tagRepository = tagRepository;
        this.currencyRepository = currencyRepository;
        this.auditService = auditService;
        this.authorizationService = authorizationService;
    }

    // ── List ────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ExpenseDTO> list(LocalDate dateFrom, LocalDate dateTo, List<Long> tagIds, boolean includeDeleted) {
        List<Expense> expenses = expenseRepository.findFiltered(dateFrom, dateTo, tagIds, includeDeleted);
        return expenses.stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Get By ID ───────────────────────────────────────────────────────────────

    @Transactional
    public ExpenseDTO getById(Long id) {
        Expense expense = requireExpense(id);
        Long userId = currentUserId();
        Long orgId = TenantContext.getCurrentOrganizationId();
        auditService.record(id, orgId, ExpenseAuditEventType.VIEWED, userId, "Viewed expense: " + expense.getTitle());
        return toDTO(expense);
    }

    // ── Create ──────────────────────────────────────────────────────────────────

    @Transactional
    public ExpenseDTO create(ExpenseCreateDTO dto) {
        Long userId = currentUserId();
        Long orgId = TenantContext.getCurrentOrganizationId();

        Expense expense = new Expense();
        expense.setOrganizationId(orgId);
        expense.setCreatedBy(userId);
        applyDto(expense, dto, orgId);

        Expense saved = expenseRepository.save(expense);
        auditService.record(saved.getId(), orgId, ExpenseAuditEventType.CREATED, userId,
                "Created expense: " + saved.getTitle());
        return toDTO(saved);
    }

    // ── Update ──────────────────────────────────────────────────────────────────

    @Transactional
    public ExpenseDTO update(Long id, ExpenseCreateDTO dto) {
        Long userId = currentUserId();
        Long orgId = TenantContext.getCurrentOrganizationId();

        Expense expense = requireExpense(id);
        if (expense.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot update a deleted expense");
        }
        expense.setUpdatedBy(userId);
        applyDto(expense, dto, orgId);

        Expense saved = expenseRepository.save(expense);
        auditService.record(saved.getId(), orgId, ExpenseAuditEventType.UPDATED, userId,
                "Updated expense: " + saved.getTitle());
        return toDTO(saved);
    }

    // ── Soft Delete ─────────────────────────────────────────────────────────────

    @Transactional
    public void softDelete(Long id, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Deletion reason is required");
        }
        Long userId = currentUserId();
        Long orgId = TenantContext.getCurrentOrganizationId();

        Expense expense = requireExpense(id);
        if (expense.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expense is already deleted");
        }

        expense.setDeleted(true);
        expense.setDeletionReason(reason.trim());
        expense.setDeletedAt(LocalDateTime.now());
        expense.setDeletedBy(userId);
        expenseRepository.save(expense);

        auditService.record(id, orgId, ExpenseAuditEventType.DELETED, userId,
                "Deleted expense: " + expense.getTitle() + " — reason: " + reason.trim());
    }

    // ── Restore ─────────────────────────────────────────────────────────────────

    @Transactional
    public ExpenseDTO restore(Long id) {
        Long userId = currentUserId();
        Long orgId = TenantContext.getCurrentOrganizationId();

        Expense expense = requireExpense(id);
        if (!expense.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expense is not deleted");
        }

        expense.setDeleted(false);
        expense.setDeletionReason(null);
        expense.setDeletedAt(null);
        expense.setDeletedBy(null);
        expense.setUpdatedBy(userId);
        Expense saved = expenseRepository.save(expense);

        auditService.record(id, orgId, ExpenseAuditEventType.RESTORED, userId,
                "Restored expense: " + expense.getTitle());
        return toDTO(saved);
    }

    // ── Tags ────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ExpenseTagDTO> listTags() {
        Long orgId = TenantContext.getCurrentOrganizationId();
        return tagRepository.findByOrganizationIdOrderByNameAsc(orgId)
                .stream().map(this::toTagDTO).collect(Collectors.toList());
    }

    @Transactional
    public ExpenseTagDTO createTag(ExpenseTagCreateDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tag name is required");
        }
        Long orgId = TenantContext.getCurrentOrganizationId();
        Long userId = currentUserId();
        String name = dto.getName().trim();

        tagRepository.findByOrganizationIdAndName(orgId, name).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tag already exists: " + name);
        });

        ExpenseTag tag = new ExpenseTag();
        tag.setOrganizationId(orgId);
        tag.setName(name);
        tag.setCreatedBy(userId);
        return toTagDTO(tagRepository.save(tag));
    }

    // ── Monthly Summary ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ExpenseMonthlySummaryDTO> getMonthlySummary(int year) {
        return expenseRepository.findMonthlySummaryByYear(year);
    }

    // ── Audit Log ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ExpenseAuditEventDTO> getAuditLog(Long expenseId, int page, int size) {
        requireExpense(expenseId);
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 100));
        Pageable pageable = PageRequest.of(safePage, safeSize);
        return auditService.getAuditLog(expenseId, pageable);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private void applyDto(Expense expense, ExpenseCreateDTO dto, Long orgId) {
        if (dto.getExpenseDate() != null) {
            expense.setExpenseDate(LocalDate.parse(dto.getExpenseDate()));
        }
        if (dto.getAmount() != null) {
            expense.setAmount(dto.getAmount());
        }
        if (dto.getCurrencyId() != null) {
            Currency currency = currencyRepository.findById(dto.getCurrencyId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Currency not found: " + dto.getCurrencyId()));
            expense.setCurrency(currency);
        }
        if (dto.getTitle() != null) {
            expense.setTitle(dto.getTitle().trim());
        }
        expense.setNotes(dto.getNotes());

        if (dto.getTagIds() != null) {
            Set<ExpenseTag> tags = new HashSet<>();
            for (Long tagId : dto.getTagIds()) {
                tagRepository.findById(tagId).ifPresent(tags::add);
            }
            expense.setTags(tags);
        }
    }

    private Expense requireExpense(Long id) {
        return expenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Expense not found: " + id));
    }

    private Long currentUserId() {
        try {
            return authorizationService.getCurrentUser().getId();
        } catch (Exception e) {
            return null;
        }
    }

    private ExpenseDTO toDTO(Expense e) {
        ExpenseDTO dto = new ExpenseDTO();
        dto.setId(e.getId());
        dto.setExpenseDate(e.getExpenseDate() != null ? e.getExpenseDate().toString() : null);
        dto.setAmount(e.getAmount());
        if (e.getCurrency() != null) {
            dto.setCurrencyId(e.getCurrency().getId());
            dto.setCurrencyCode(e.getCurrency().getCode());
            dto.setCurrencySymbol(e.getCurrency().getSymbol());
        }
        dto.setTitle(e.getTitle());
        dto.setNotes(e.getNotes());
        dto.setDeleted(e.isDeleted());
        dto.setDeletionReason(e.getDeletionReason());
        dto.setDeletedAt(e.getDeletedAt() != null ? e.getDeletedAt().toString() : null);
        dto.setDeletedBy(e.getDeletedBy());
        dto.setCreatedBy(e.getCreatedBy());
        dto.setCreatedAt(e.getCreatedAt() != null ? e.getCreatedAt().toString() : null);
        dto.setUpdatedBy(e.getUpdatedBy());
        dto.setUpdatedAt(e.getUpdatedAt() != null ? e.getUpdatedAt().toString() : null);
        dto.setTags(e.getTags() != null
                ? e.getTags().stream().map(this::toTagDTO).collect(Collectors.toList())
                : List.of());
        return dto;
    }

    private ExpenseTagDTO toTagDTO(ExpenseTag t) {
        ExpenseTagDTO dto = new ExpenseTagDTO();
        dto.setId(t.getId());
        dto.setName(t.getName());
        dto.setOrganizationId(t.getOrganizationId());
        return dto;
    }
}

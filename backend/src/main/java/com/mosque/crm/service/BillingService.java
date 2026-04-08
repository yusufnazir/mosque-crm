package com.mosque.crm.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.RecordSubscriptionPaymentRequest;
import com.mosque.crm.dto.SubscriptionInvoiceDTO;
import com.mosque.crm.dto.SubscriptionPaymentDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.OrganizationSubscription;
import com.mosque.crm.entity.SubscriptionInvoice;
import com.mosque.crm.entity.SubscriptionPayment;
import com.mosque.crm.enums.InvoiceStatus;
import com.mosque.crm.enums.OrganizationSubscriptionStatus;
import com.mosque.crm.enums.PlanBillingCycle;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.OrganizationSubscriptionRepository;
import com.mosque.crm.repository.SubscriptionInvoiceRepository;
import com.mosque.crm.repository.SubscriptionPaymentRepository;

@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);

    private static final int INVOICE_DAYS_BEFORE_DUE = 7;
    private static final int GRACE_PERIOD_DAYS = 7;
    private static final int LOCK_DAYS_AFTER_DUE = 14;

    private final OrganizationSubscriptionRepository subscriptionRepository;
    private final SubscriptionInvoiceRepository invoiceRepository;
    private final SubscriptionPaymentRepository paymentRepository;
    private final OrganizationRepository organizationRepository;

    public BillingService(OrganizationSubscriptionRepository subscriptionRepository,
            SubscriptionInvoiceRepository invoiceRepository,
            SubscriptionPaymentRepository paymentRepository,
            OrganizationRepository organizationRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.organizationRepository = organizationRepository;
    }

    // -------------------------------------------------------------------------
    // Billing job — scheduled via BillingSchedulerConfig (configurable cron)
    // -------------------------------------------------------------------------

    @Transactional
    public void dailyBillingJob() {
        dailyBillingJob(false);
    }

    /**
     * @param forced when true, skips the 7-day lookahead window so invoices are
     *               generated immediately for every active subscription that
     *               doesn't already have an invoice for the current period.
     */
    @Transactional
    public void dailyBillingJob(boolean forced) {
        log.info("Starting daily billing job (forced={})", forced);
        generateInvoices(forced);
        updateOverdueInvoices();
        updateSubscriptionStatuses();
        log.info("Daily billing job completed");
    }

    /**
     * Generate invoices 7 days before the billing cycle ends for all ACTIVE subscriptions.
     * Only one invoice per billing period (de-duplicated by period_start + period_end).
     */
    public void generateInvoices() {
        generateInvoices(false);
    }

    /**
     * @param forced when true, generates an invoice for every active subscription
     *               whose current period has no invoice yet, regardless of how far
     *               away the due date is.
     */
    public void generateInvoices(boolean forced) {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        LocalDate targetDueDate = today.plusDays(INVOICE_DAYS_BEFORE_DUE);

        List<OrganizationSubscription> activeSubscriptions = subscriptionRepository
                .findByStatus(OrganizationSubscriptionStatus.ACTIVE);

        log.info("generateInvoices: found {} ACTIVE subscriptions (forced={})", activeSubscriptions.size(), forced);

        // For each organization, only bill its most recently started subscription
        // (the one that getCurrentSubscription() would return). This prevents duplicate
        // invoices when an org has multiple ACTIVE rows (e.g. from admin-created extras
        // or scheduled downgrades that haven't been cleaned up yet).
        Map<Long, OrganizationSubscription> currentPerOrg = new java.util.LinkedHashMap<>();
        for (OrganizationSubscription sub : activeSubscriptions) {
            if (sub.getOrganizationId() == null) continue;
            // Skip future-dated subscriptions (not yet started)
            if (sub.getStartsAt() != null && sub.getStartsAt().isAfter(now)) {
                log.debug("Skipping subscription={} org={}: startsAt={} is in the future",
                        sub.getId(), sub.getOrganizationId(), sub.getStartsAt());
                continue;
            }
            OrganizationSubscription existing = currentPerOrg.get(sub.getOrganizationId());
            if (existing == null || (sub.getStartsAt() != null && existing.getStartsAt() != null
                    && sub.getStartsAt().isAfter(existing.getStartsAt()))) {
                currentPerOrg.put(sub.getOrganizationId(), sub);
            }
        }

        log.info("generateInvoices: billing {} organization(s) after deduplication", currentPerOrg.size());

        for (OrganizationSubscription sub : currentPerOrg.values()) {
            if (sub.getNextDueDate() == null) {
                log.debug("Skipping subscription={} org={}: nextDueDate is null", sub.getId(), sub.getOrganizationId());
                continue;
            }

            // Skip billing for subscriptions with billing disabled
            if (Boolean.FALSE.equals(sub.getBillingEnabled())) {
                log.debug("Skipping subscription={} org={}: billingEnabled=false", sub.getId(), sub.getOrganizationId());
                continue;
            }

            LocalDate dueDate = sub.getNextDueDate().toLocalDate();

            // In normal (non-forced) mode skip subscriptions outside the lookahead window
            if (!forced && !dueDate.isEqual(targetDueDate) && !dueDate.isBefore(targetDueDate)) {
                log.debug("Skipping subscription={} org={}: dueDate={} is beyond lookahead window {}",
                        sub.getId(), sub.getOrganizationId(), dueDate, targetDueDate);
                continue;
            }

            // Calculate billing period
            LocalDate periodEnd = dueDate;
            LocalDate periodStart = subtractCycle(periodEnd, sub.getBillingCycle());

            // Check for duplicate invoice
            if (invoiceRepository.findBySubscriptionIdAndPeriodStartAndPeriodEnd(
                    sub.getId(), periodStart, periodEnd).isPresent()) {
                log.debug("Invoice already exists for subscription={} period={} to {}", sub.getId(), periodStart, periodEnd);
                continue;
            }

            BigDecimal amount = getSubscriptionPrice(sub);
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            SubscriptionInvoice invoice = new SubscriptionInvoice();
            invoice.setOrganizationId(sub.getOrganizationId());
            invoice.setSubscription(sub);
            invoice.setAmount(amount);
            invoice.setCurrency("EUR");
            invoice.setIssueDate(today);
            invoice.setDueDate(dueDate);
            invoice.setPeriodStart(periodStart);
            invoice.setPeriodEnd(periodEnd);
            invoice.setStatus(InvoiceStatus.PENDING);

            invoiceRepository.save(invoice);
            log.info("Generated invoice for subscription={} org={} amount={} due={}",
                    sub.getId(), sub.getOrganizationId(), amount, dueDate);
        }
    }

    /**
     * Mark PENDING invoices as OVERDUE once past their due date.
     */
    public void updateOverdueInvoices() {
        LocalDate today = LocalDate.now();
        List<SubscriptionInvoice> overdueInvoices = invoiceRepository
                .findByStatusAndDueDateBefore(InvoiceStatus.PENDING, today);

        for (SubscriptionInvoice invoice : overdueInvoices) {
            invoice.setStatus(InvoiceStatus.OVERDUE);
            invoiceRepository.save(invoice);
            log.info("Marked invoice={} as OVERDUE for org={}", invoice.getId(), invoice.getOrganizationId());
        }
    }

    /**
     * Transition subscription statuses based on billing dates:
     * - ACTIVE: today <= next_due_date
     * - GRACE: today > next_due_date AND today <= grace_end_date
     * - READ_ONLY: today > grace_end_date AND today <= lock_date
     * - LOCKED: today > lock_date
     */
    public void updateSubscriptionStatuses() {
        LocalDate today = LocalDate.now();

        List<OrganizationSubscriptionStatus> billableStatuses = List.of(
                OrganizationSubscriptionStatus.ACTIVE,
                OrganizationSubscriptionStatus.GRACE,
                OrganizationSubscriptionStatus.READ_ONLY);

        List<OrganizationSubscription> subscriptions = subscriptionRepository.findByStatusIn(billableStatuses);

        for (OrganizationSubscription sub : subscriptions) {
            if (sub.getNextDueDate() == null) {
                continue;
            }

            // Skip status transitions for subscriptions with billing disabled
            if (Boolean.FALSE.equals(sub.getBillingEnabled())) {
                continue;
            }

            LocalDate dueDate = sub.getNextDueDate().toLocalDate();
            OrganizationSubscriptionStatus newStatus = determineStatus(today, dueDate, sub);

            if (newStatus != sub.getStatus()) {
                OrganizationSubscriptionStatus oldStatus = sub.getStatus();
                sub.setStatus(newStatus);
                subscriptionRepository.save(sub);
                log.info("Subscription={} org={} transitioned {} -> {}",
                        sub.getId(), sub.getOrganizationId(), oldStatus, newStatus);
            }
        }
    }

    private OrganizationSubscriptionStatus determineStatus(LocalDate today, LocalDate dueDate,
            OrganizationSubscription sub) {
        if (!today.isAfter(dueDate)) {
            return OrganizationSubscriptionStatus.ACTIVE;
        }

        LocalDate graceEnd = sub.getGraceEndDate() != null
                ? sub.getGraceEndDate().toLocalDate()
                : dueDate.plusDays(GRACE_PERIOD_DAYS);

        LocalDate lockDate = sub.getLockDate() != null
                ? sub.getLockDate().toLocalDate()
                : dueDate.plusDays(LOCK_DAYS_AFTER_DUE);

        if (!today.isAfter(graceEnd)) {
            return OrganizationSubscriptionStatus.GRACE;
        }

        if (!today.isAfter(lockDate)) {
            return OrganizationSubscriptionStatus.READ_ONLY;
        }

        return OrganizationSubscriptionStatus.LOCKED;
    }

    // -------------------------------------------------------------------------
    // Payment handling
    // -------------------------------------------------------------------------

    @Transactional
    public SubscriptionPayment recordPayment(Long invoiceId, RecordSubscriptionPaymentRequest request) {
        SubscriptionInvoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setOrganizationId(invoice.getOrganizationId());
        payment.setInvoice(invoice);
        payment.setAmount(request.getAmount());
        payment.setCurrency(request.getCurrency() != null ? request.getCurrency() : invoice.getCurrency());
        payment.setPaymentDate(LocalDateTime.now());
        payment.setPaymentMethod(request.getPaymentMethod());
        payment.setReference(request.getReference());

        SubscriptionPayment saved = paymentRepository.save(payment);

        // Mark invoice as paid
        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        // Restore subscription to ACTIVE and advance billing cycle
        OrganizationSubscription sub = invoice.getSubscription();
        restoreSubscriptionAfterPayment(sub);

        log.info("Recorded payment={} for invoice={} amount={} org={}",
                saved.getId(), invoiceId, request.getAmount(), invoice.getOrganizationId());
        return saved;
    }

    private void restoreSubscriptionAfterPayment(OrganizationSubscription sub) {
        LocalDateTime now = LocalDateTime.now();
        sub.setStatus(OrganizationSubscriptionStatus.ACTIVE);
        sub.setLastPaymentDate(now);

        // Advance billing cycle
        LocalDateTime currentEnd = sub.getEndsAt() != null ? sub.getEndsAt() : sub.getNextDueDate();
        if (currentEnd == null) {
            currentEnd = now;
        }
        LocalDateTime newEnd = addCycle(currentEnd, sub.getBillingCycle());
        LocalDate newDueDate = newEnd.toLocalDate();

        sub.setStartsAt(currentEnd);
        sub.setEndsAt(newEnd);
        sub.setNextDueDate(newEnd);
        sub.setGraceEndDate(newDueDate.plusDays(GRACE_PERIOD_DAYS).atStartOfDay());
        sub.setReadOnlyDate(newDueDate.plusDays(GRACE_PERIOD_DAYS).atStartOfDay());
        sub.setLockDate(newDueDate.plusDays(LOCK_DAYS_AFTER_DUE).atStartOfDay());

        subscriptionRepository.save(sub);
        log.info("Restored subscription={} to ACTIVE, next_due_date={}", sub.getId(), newEnd);
    }

    private LocalDateTime addCycle(LocalDateTime dateTime, PlanBillingCycle cycle) {
        return cycle == PlanBillingCycle.YEARLY ? dateTime.plusYears(1) : dateTime.plusMonths(1);
    }

    private LocalDate subtractCycle(LocalDate date, PlanBillingCycle cycle) {
        return cycle == PlanBillingCycle.YEARLY ? date.minusYears(1) : date.minusMonths(1);
    }

    private BigDecimal getSubscriptionPrice(OrganizationSubscription sub) {
        if (sub.getPlan() == null) {
            return null;
        }
        return sub.getBillingCycle() == PlanBillingCycle.YEARLY
                ? sub.getPlan().getYearlyPrice()
                : sub.getPlan().getMonthlyPrice();
    }

    // -------------------------------------------------------------------------
    // Query methods
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<SubscriptionInvoice> getInvoicesForOrganization(Long organizationId) {
        return invoiceRepository.findByOrganizationIdOrderByIssueDateDesc(organizationId);
    }

    @Transactional(readOnly = true)
    public SubscriptionInvoice getInvoice(Long invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPayment> getPaymentsForInvoice(Long invoiceId) {
        return paymentRepository.findByInvoiceIdOrderByPaymentDateDesc(invoiceId);
    }

    @Transactional
    public void deleteInvoice(Long invoiceId) {
        SubscriptionInvoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found: " + invoiceId));
        invoiceRepository.delete(invoice);
        log.info("Deleted invoice={} for org={}", invoiceId, invoice.getOrganizationId());
    }

    // -------------------------------------------------------------------------
    // DTO mapping
    // -------------------------------------------------------------------------

    public SubscriptionInvoiceDTO toInvoiceDTO(SubscriptionInvoice invoice) {
        SubscriptionInvoiceDTO dto = new SubscriptionInvoiceDTO();
        dto.setId(invoice.getId());
        dto.setOrganizationId(invoice.getOrganizationId());
        if (invoice.getOrganizationId() != null) {
            organizationRepository.findById(invoice.getOrganizationId())
                    .ifPresent(org -> dto.setOrganizationName(org.getName()));
        }
        dto.setSubscriptionId(invoice.getSubscription() != null ? invoice.getSubscription().getId() : null);
        if (invoice.getSubscription() != null && invoice.getSubscription().getPlan() != null) {
            dto.setPlanName(invoice.getSubscription().getPlan().getName());
        }
        dto.setAmount(invoice.getAmount());
        dto.setCurrency(invoice.getCurrency());
        dto.setIssueDate(invoice.getIssueDate());
        dto.setDueDate(invoice.getDueDate());
        dto.setPeriodStart(invoice.getPeriodStart());
        dto.setPeriodEnd(invoice.getPeriodEnd());
        dto.setStatus(invoice.getStatus());
        dto.setPaidAt(invoice.getPaidAt());
        dto.setNotes(invoice.getNotes());
        dto.setCreatedAt(invoice.getCreatedAt());
        dto.setUpdatedAt(invoice.getUpdatedAt());
        return dto;
    }

    public SubscriptionPaymentDTO toPaymentDTO(SubscriptionPayment payment) {
        SubscriptionPaymentDTO dto = new SubscriptionPaymentDTO();
        dto.setId(payment.getId());
        dto.setOrganizationId(payment.getOrganizationId());
        dto.setInvoiceId(payment.getInvoice() != null ? payment.getInvoice().getId() : null);
        dto.setAmount(payment.getAmount());
        dto.setCurrency(payment.getCurrency());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setPaymentMethod(payment.getPaymentMethod());
        dto.setReference(payment.getReference());
        dto.setCreatedAt(payment.getCreatedAt());
        return dto;
    }
}

package com.mosque.crm.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.MemberPaymentCreateDTO;
import com.mosque.crm.dto.MemberPaymentDTO;
import com.mosque.crm.entity.ContributionType;
import com.mosque.crm.entity.Currency;
import com.mosque.crm.entity.MemberPayment;
import com.mosque.crm.entity.Person;
import com.mosque.crm.repository.ContributionTypeRepository;
import com.mosque.crm.repository.CurrencyRepository;
import com.mosque.crm.repository.MemberPaymentRepository;
import com.mosque.crm.repository.PersonRepository;

/**
 * Service for managing MemberPayments.
 *
 * Business rules:
 * - Cannot create payments for deactivated contribution types
 * - Person must exist
 * - ContributionType must exist
 * - Amount must be positive
 */
@Service
public class MemberPaymentService {

    private static final Logger log = LoggerFactory.getLogger(MemberPaymentService.class);

    private final MemberPaymentRepository paymentRepository;
    private final PersonRepository personRepository;
    private final ContributionTypeRepository contributionTypeRepository;
    private final CurrencyRepository currencyRepository;

    public MemberPaymentService(MemberPaymentRepository paymentRepository,
                                 PersonRepository personRepository,
                                 ContributionTypeRepository contributionTypeRepository,
                                 CurrencyRepository currencyRepository) {
        this.paymentRepository = paymentRepository;
        this.personRepository = personRepository;
        this.contributionTypeRepository = contributionTypeRepository;
        this.currencyRepository = currencyRepository;
    }

    /**
     * Get all payments with pagination.
     */
    @Transactional(readOnly = true)
    public Page<MemberPaymentDTO> getAllPayments(Pageable pageable) {
        return paymentRepository.findAllWithDetails(pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get all payments with pagination, filtered by year.
     */
    @Transactional(readOnly = true)
    public Page<MemberPaymentDTO> getAllPayments(int year, Pageable pageable) {
        return paymentRepository.findAllByYear(year, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get all payments (no pagination).
     */
    @Transactional(readOnly = true)
    public List<MemberPaymentDTO> getAllPayments() {
        return paymentRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get payment by ID.
     */
    @Transactional(readOnly = true)
    public MemberPaymentDTO getPaymentById(Long id) {
        MemberPayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + id));
        return convertToDTO(payment);
    }

    /**
     * Get all payments for a specific person (no pagination).
     */
    @Transactional(readOnly = true)
    public List<MemberPaymentDTO> getPaymentsByPerson(Long personId) {
        return paymentRepository.findByPersonIdWithDetailsList(personId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get payments for a specific person with pagination.
     */
    @Transactional(readOnly = true)
    public Page<MemberPaymentDTO> getPaymentsByPerson(Long personId, Pageable pageable) {
        return paymentRepository.findByPersonIdWithDetails(personId, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get payments for a specific person with pagination, filtered by year.
     */
    @Transactional(readOnly = true)
    public Page<MemberPaymentDTO> getPaymentsByPerson(Long personId, int year, Pageable pageable) {
        return paymentRepository.findByPersonIdAndYear(personId, year, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get all payments for a specific contribution type.
     */
    @Transactional(readOnly = true)
    public List<MemberPaymentDTO> getPaymentsByType(Long contributionTypeId) {
        return paymentRepository.findByContributionTypeId(contributionTypeId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get payments filtered by contribution type with pagination.
     */
    @Transactional(readOnly = true)
    public Page<MemberPaymentDTO> getPaymentsByType(Long contributionTypeId, Pageable pageable) {
        return paymentRepository.findByContributionTypeIdWithDetails(contributionTypeId, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get payments filtered by contribution type and year with pagination.
     */
    @Transactional(readOnly = true)
    public Page<MemberPaymentDTO> getPaymentsByTypeAndYear(Long contributionTypeId, int year, Pageable pageable) {
        return paymentRepository.findByContributionTypeIdAndYear(contributionTypeId, year, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get payments filtered by person and contribution type with pagination.
     */
    @Transactional(readOnly = true)
    public Page<MemberPaymentDTO> getPaymentsByPersonAndType(Long personId, Long contributionTypeId, Pageable pageable) {
        return paymentRepository.findByPersonIdAndContributionTypeId(personId, contributionTypeId, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get payments filtered by person, contribution type, and year with pagination.
     */
    @Transactional(readOnly = true)
    public Page<MemberPaymentDTO> getPaymentsByPersonAndTypeAndYear(Long personId, Long contributionTypeId, int year, Pageable pageable) {
        return paymentRepository.findByPersonIdAndContributionTypeIdAndYear(personId, contributionTypeId, year, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Create a new payment.
     */
    @Transactional
    public MemberPaymentDTO createPayment(MemberPaymentCreateDTO createDTO) {
        Person person = personRepository.findById(createDTO.getPersonId())
                .orElseThrow(() -> new RuntimeException("Person not found with id: " + createDTO.getPersonId()));

        ContributionType type = contributionTypeRepository.findById(createDTO.getContributionTypeId())
                .orElseThrow(() -> new RuntimeException("Contribution type not found with id: " + createDTO.getContributionTypeId()));

        // Business rule: cannot create payments for deactivated types
        if (!type.getIsActive()) {
            throw new RuntimeException("Cannot create payment for deactivated contribution type: " + type.getCode());
        }

        MemberPayment payment = new MemberPayment();
        payment.setPerson(person);
        payment.setContributionType(type);
        payment.setAmount(createDTO.getAmount());
        payment.setPaymentDate(createDTO.getPaymentDate());
        payment.setPeriodFrom(createDTO.getPeriodFrom());
        payment.setPeriodTo(createDTO.getPeriodTo());
        payment.setReference(createDTO.getReference());
        payment.setNotes(createDTO.getNotes());

        if (createDTO.getCurrencyId() != null) {
            Currency currency = currencyRepository.findById(createDTO.getCurrencyId())
                    .orElseThrow(() -> new RuntimeException("Currency not found with id: " + createDTO.getCurrencyId()));
            payment.setCurrency(currency);
        }

        payment = paymentRepository.save(payment);
        log.info("Created payment: person={}, type={}, amount={}, date={}",
                person.getId(), type.getCode(), payment.getAmount(), payment.getPaymentDate());
        return convertToDTO(payment);
    }

    /**
     * Update an existing payment.
     */
    @Transactional
    public MemberPaymentDTO updatePayment(Long id, MemberPaymentCreateDTO updateDTO) {
        MemberPayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + id));

        // If changing the contribution type, validate the new type
        if (!payment.getContributionType().getId().equals(updateDTO.getContributionTypeId())) {
            ContributionType newType = contributionTypeRepository.findById(updateDTO.getContributionTypeId())
                    .orElseThrow(() -> new RuntimeException("Contribution type not found with id: " + updateDTO.getContributionTypeId()));
            if (!newType.getIsActive()) {
                throw new RuntimeException("Cannot assign payment to deactivated contribution type: " + newType.getCode());
            }
            payment.setContributionType(newType);
        }

        // If changing the person, validate the new person
        if (!payment.getPerson().getId().equals(updateDTO.getPersonId())) {
            Person newPerson = personRepository.findById(updateDTO.getPersonId())
                    .orElseThrow(() -> new RuntimeException("Person not found with id: " + updateDTO.getPersonId()));
            payment.setPerson(newPerson);
        }

        payment.setAmount(updateDTO.getAmount());
        payment.setPaymentDate(updateDTO.getPaymentDate());
        payment.setPeriodFrom(updateDTO.getPeriodFrom());
        payment.setPeriodTo(updateDTO.getPeriodTo());
        payment.setReference(updateDTO.getReference());
        payment.setNotes(updateDTO.getNotes());

        if (updateDTO.getCurrencyId() != null) {
            Currency currency = currencyRepository.findById(updateDTO.getCurrencyId())
                    .orElseThrow(() -> new RuntimeException("Currency not found with id: " + updateDTO.getCurrencyId()));
            payment.setCurrency(currency);
        } else {
            payment.setCurrency(null);
        }

        payment = paymentRepository.save(payment);
        log.info("Updated payment id={}", payment.getId());
        return convertToDTO(payment);
    }

    /**
     * Delete a payment.
     */
    @Transactional
    public void deletePayment(Long id) {
        MemberPayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + id));
        paymentRepository.delete(payment);
        log.info("Deleted payment id={}", id);
    }

    /**
     * Create a reversal payment that negates the original payment.
     * The reversal mirrors the original but with a negative amount.
     */
    @Transactional
    public MemberPaymentDTO reversePayment(Long originalPaymentId) {
        MemberPayment original = paymentRepository.findById(originalPaymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + originalPaymentId));

        if (Boolean.TRUE.equals(original.getIsReversal())) {
            throw new RuntimeException("Cannot reverse a reversal payment");
        }

        // Check if this payment already has a reversal
        if (paymentRepository.existsByReversedPaymentId(originalPaymentId)) {
            throw new RuntimeException("This payment has already been reversed");
        }

        MemberPayment reversal = new MemberPayment();
        reversal.setPerson(original.getPerson());
        reversal.setContributionType(original.getContributionType());
        reversal.setAmount(original.getAmount().negate());
        reversal.setPaymentDate(java.time.LocalDate.now());
        reversal.setPeriodFrom(original.getPeriodFrom());
        reversal.setPeriodTo(original.getPeriodTo());
        reversal.setReference("Reversal of #" + original.getId());
        reversal.setNotes("Reversal of payment #" + original.getId()
                + (original.getReference() != null ? " (" + original.getReference() + ")" : ""));
        reversal.setCurrency(original.getCurrency());
        reversal.setIsReversal(true);
        reversal.setReversedPayment(original);

        reversal = paymentRepository.save(reversal);
        log.info("Created reversal payment id={} for original payment id={}", reversal.getId(), originalPaymentId);
        return convertToDTO(reversal);
    }

    // ===== DTO conversion =====

    private MemberPaymentDTO convertToDTO(MemberPayment payment) {
        MemberPaymentDTO dto = new MemberPaymentDTO();
        dto.setId(payment.getId());
        dto.setPersonId(payment.getPerson().getId());
        dto.setPersonName(payment.getPerson().getFirstName() +
                (payment.getPerson().getLastName() != null ? " " + payment.getPerson().getLastName() : ""));
        dto.setContributionTypeId(payment.getContributionType().getId());
        dto.setContributionTypeCode(payment.getContributionType().getCode());
        dto.setAmount(payment.getAmount());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setPeriodFrom(payment.getPeriodFrom());
        dto.setPeriodTo(payment.getPeriodTo());
        dto.setReference(payment.getReference());
        dto.setNotes(payment.getNotes());
        dto.setCreatedBy(payment.getCreatedBy());
        dto.setCreatedAt(payment.getCreatedAt());
        if (payment.getCurrency() != null) {
            dto.setCurrencyId(payment.getCurrency().getId());
            dto.setCurrencyCode(payment.getCurrency().getCode());
            dto.setCurrencySymbol(payment.getCurrency().getSymbol());
        }
        dto.setIsReversal(payment.getIsReversal());
        if (payment.getReversedPayment() != null) {
            dto.setReversedPaymentId(payment.getReversedPayment().getId());
        }
        return dto;
    }

    /**
     * Get total income grouped by contribution type for a specific year.
     * Returns a map of contribution type code → total amount.
     */
    @Transactional(readOnly = true)
    public Map<String, BigDecimal> getIncomeByContributionType(int year) {
        List<Object[]> rows = paymentRepository.sumAmountByContributionTypeForYear(year);
        Map<String, BigDecimal> result = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String code = (String) row[0];
            BigDecimal total = (BigDecimal) row[1];
            result.put(code, total);
        }
        return result;
    }

    /**
     * Get all distinct years that have payment data.
     */
    @Transactional(readOnly = true)
    public List<Integer> getPaymentYears() {
        return paymentRepository.findDistinctPaymentYears();
    }
}

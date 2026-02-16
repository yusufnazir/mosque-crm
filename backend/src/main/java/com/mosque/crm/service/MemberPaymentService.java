package com.mosque.crm.service;

import java.util.List;
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
     * Get all payments for a specific person.
     */
    @Transactional(readOnly = true)
    public List<MemberPaymentDTO> getPaymentsByPerson(Long personId) {
        return paymentRepository.findByPersonIdWithDetails(personId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
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
        return dto;
    }
}

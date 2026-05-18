package com.mosque.crm.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.report.ContributionTotalReportDTO;
import com.mosque.crm.dto.report.ContributionTotalReportDTO.ContributionTotalRow;
import com.mosque.crm.dto.report.ContributionTotalReportDTO.CurrencyTotal;
import com.mosque.crm.dto.report.MemberDirectoryReportDTO;
import com.mosque.crm.dto.report.MemberDirectoryReportDTO.MemberDirectoryFamilyGroup;
import com.mosque.crm.dto.report.MemberDirectoryReportDTO.MemberDirectoryRow;
import com.mosque.crm.service.MemberDirectoryFamilyResolver.FamilyAssignment;
import com.mosque.crm.dto.report.PaymentSummaryReportDTO;
import com.mosque.crm.dto.report.PaymentSummaryReportDTO.ContributionTypeColumn;
import com.mosque.crm.dto.report.PaymentSummaryReportDTO.CurrencyAmount;
import com.mosque.crm.dto.report.PaymentSummaryReportDTO.PersonPaymentRow;
import com.mosque.crm.entity.MemberPayment;
import com.mosque.crm.entity.Person;
import com.mosque.crm.enums.PersonStatus;
import com.mosque.crm.repository.ContributionTypeRepository;
import com.mosque.crm.repository.MemberPaymentRepository;
import com.mosque.crm.repository.PersonRepository;
import com.mosque.crm.util.PersonNameUtil;

@Service
public class ReportService {

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    private final MemberPaymentRepository paymentRepository;
    private final ContributionTypeRepository contributionTypeRepository;
    private final PersonRepository personRepository;
    private final MemberDirectoryFamilyResolver familyResolver;

    public ReportService(MemberPaymentRepository paymentRepository,
                         ContributionTypeRepository contributionTypeRepository,
                         PersonRepository personRepository,
                         MemberDirectoryFamilyResolver familyResolver) {
        this.paymentRepository = paymentRepository;
        this.contributionTypeRepository = contributionTypeRepository;
        this.personRepository = personRepository;
        this.familyResolver = familyResolver;
    }

    /**
     * Generate the payment summary report for a given year and locale.
     * Returns all persons who made at least one payment in the year,
     * with amounts broken down by contribution type and currency.
     */
    @Transactional(readOnly = true)
    public PaymentSummaryReportDTO generatePaymentSummary(int year, String locale, int page, int size) {
        log.info("Generating payment summary report for year {} with locale {} (page={}, size={})", year, locale, page, size);

        // 1. Get all active contribution types for column headers
        List<ContributionTypeColumn> columns = contributionTypeRepository.findAll().stream()
                .filter(ct -> Boolean.TRUE.equals(ct.getIsActive()))
                .sorted(Comparator.comparing(ct -> ct.getCode() != null ? ct.getCode() : ""))
                .map(ct -> {
                    String name = ct.getCode(); // fallback
                    if (ct.getTranslations() != null) {
                        var translation = ct.getTranslation(locale != null ? locale : "en");
                        if (translation != null && translation.getName() != null) {
                            name = translation.getName();
                        }
                    }
                    return new ContributionTypeColumn(ct.getId(), ct.getCode(), name);
                })
                .collect(Collectors.toList());

        // 2. Fetch all non-reversal payments for the year
        List<MemberPayment> payments = paymentRepository.findPaymentsForReport(year);

        if (payments.isEmpty()) {
            return new PaymentSummaryReportDTO(year, columns, new ArrayList<>(), page, size, 0);
        }

        // 3. Group payments by person
        // personId → (contributionTypeId → (currencyCode → running total))
        Map<Long, Map<Long, Map<String, BigDecimal>>> grouped = new LinkedHashMap<>();
        // Track currency symbols
        Map<String, String> currencySymbols = new HashMap<>();
        // Track person names
        Map<Long, String[]> personNames = new HashMap<>();

        for (MemberPayment payment : payments) {
            if (payment.getPerson() == null || payment.getContributionType() == null) {
                continue;
            }

            Long personId = payment.getPerson().getId();
            Long typeId = payment.getContributionType().getId();
            String currCode = payment.getCurrency() != null ? payment.getCurrency().getCode() : "???";
            String currSymbol = payment.getCurrency() != null ? payment.getCurrency().getSymbol() : "?";
            BigDecimal amount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;

            currencySymbols.putIfAbsent(currCode, currSymbol);
            personNames.putIfAbsent(personId, new String[] {
                    payment.getPerson().getLastName(),
                    payment.getPerson().getFirstName()
            });

            grouped.computeIfAbsent(personId, k -> new HashMap<>())
                    .computeIfAbsent(typeId, k -> new HashMap<>())
                    .merge(currCode, amount, BigDecimal::add);
        }

        // 4. Build rows sorted by lastName, firstName
        List<PersonPaymentRow> rows = grouped.entrySet().stream()
                .map(entry -> {
                    Long personId = entry.getKey();
                    Map<Long, Map<String, BigDecimal>> typeMap = entry.getValue();
                    String[] names = personNames.get(personId);

                    // Build amounts map: typeId → list of CurrencyAmount
                    Map<Long, List<CurrencyAmount>> amounts = new LinkedHashMap<>();
                    // Track person totals per currency
                    Map<String, BigDecimal> personTotals = new HashMap<>();

                    for (ContributionTypeColumn col : columns) {
                        Map<String, BigDecimal> currencyMap = typeMap.getOrDefault(col.getId(), Map.of());
                        List<CurrencyAmount> currAmounts = currencyMap.entrySet().stream()
                                .sorted(Map.Entry.comparingByKey())
                                .map(e -> {
                                    personTotals.merge(e.getKey(), e.getValue(), BigDecimal::add);
                                    return new CurrencyAmount(e.getKey(), currencySymbols.getOrDefault(e.getKey(), "?"), e.getValue());
                                })
                                .collect(Collectors.toList());
                        amounts.put(col.getId(), currAmounts);
                    }

                    List<CurrencyAmount> totals = personTotals.entrySet().stream()
                            .sorted(Map.Entry.comparingByKey())
                            .map(e -> new CurrencyAmount(e.getKey(), currencySymbols.getOrDefault(e.getKey(), "?"), e.getValue()))
                            .collect(Collectors.toList());

                    return new PersonPaymentRow(personId, names[0], names[1], amounts, totals);
                })
                .sorted(Comparator.comparing((PersonPaymentRow r) -> r.getLastName() != null ? r.getLastName().toLowerCase() : "")
                        .thenComparing(r -> r.getFirstName() != null ? r.getFirstName().toLowerCase() : ""))
                .collect(Collectors.toList());

        // 5. Apply in-memory pagination
        long totalElements = rows.size();
        if (size > 0) {
            int fromIndex = Math.min(page * size, rows.size());
            int toIndex = Math.min(fromIndex + size, rows.size());
            List<PersonPaymentRow> pagedRows = rows.subList(fromIndex, toIndex);
            return new PaymentSummaryReportDTO(year, columns, pagedRows, page, size, totalElements);
        }

        return new PaymentSummaryReportDTO(year, columns, rows);
    }

    /**
     * Generate the contribution totals report for a given year.
     * Returns total amounts per contribution type per currency.
     */
    @Transactional(readOnly = true)
    public ContributionTotalReportDTO generateContributionTotals(int year, String locale) {
        log.info("Generating contribution totals report for year {} with locale {}", year, locale);

        // 1. Fetch all non-reversal payments for the year
        List<MemberPayment> payments = paymentRepository.findPaymentsForReport(year);

        // 2. Get active contribution types for display names
        Map<Long, String[]> typeInfo = new LinkedHashMap<>(); // id -> [code, name]
        contributionTypeRepository.findAll().stream()
                .filter(ct -> Boolean.TRUE.equals(ct.getIsActive()))
                .sorted(Comparator.comparing(ct -> ct.getCode() != null ? ct.getCode() : ""))
                .forEach(ct -> {
                    String name = ct.getCode();
                    if (ct.getTranslations() != null) {
                        var translation = ct.getTranslation(locale != null ? locale : "en");
                        if (translation != null && translation.getName() != null) {
                            name = translation.getName();
                        }
                    }
                    typeInfo.put(ct.getId(), new String[]{ct.getCode(), name});
                });

        // 3. Group: contributionTypeId -> currencyCode -> total
        Map<Long, Map<String, BigDecimal>> grouped = new LinkedHashMap<>();
        Map<String, BigDecimal> grandTotalMap = new LinkedHashMap<>();
        java.util.Set<String> allCurrencies = new java.util.TreeSet<>();

        for (MemberPayment payment : payments) {
            if (payment.getContributionType() == null) continue;
            Long typeId = payment.getContributionType().getId();
            String currCode = payment.getCurrency() != null ? payment.getCurrency().getCode() : "???";
            BigDecimal amount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;

            allCurrencies.add(currCode);
            grouped.computeIfAbsent(typeId, k -> new LinkedHashMap<>())
                    .merge(currCode, amount, BigDecimal::add);
            grandTotalMap.merge(currCode, amount, BigDecimal::add);
        }

        List<String> currencies = new ArrayList<>(allCurrencies);

        // 4. Build rows
        List<ContributionTotalRow> rows = typeInfo.entrySet().stream()
                .map(entry -> {
                    Long typeId = entry.getKey();
                    String[] info = entry.getValue();
                    Map<String, BigDecimal> currencyMap = grouped.getOrDefault(typeId, Map.of());
                    List<CurrencyTotal> totals = currencies.stream()
                            .map(cur -> new CurrencyTotal(cur, currencyMap.getOrDefault(cur, BigDecimal.ZERO)))
                            .collect(Collectors.toList());
                    return new ContributionTotalRow(typeId, info[0], info[1], totals);
                })
                .collect(Collectors.toList());

        // 5. Grand totals
        List<CurrencyTotal> grandTotals = currencies.stream()
                .map(cur -> new CurrencyTotal(cur, grandTotalMap.getOrDefault(cur, BigDecimal.ZERO)))
                .collect(Collectors.toList());

        return new ContributionTotalReportDTO(year, currencies, rows, grandTotals);
    }

    /**
     * Generate a directory of all members with profile fields for export.
     */
    @Transactional(readOnly = true)
    public MemberDirectoryReportDTO generateMemberDirectory() {
        log.info("Generating member directory report");

        List<Person> persons = personRepository.findAll();
        Map<Long, FamilyAssignment> assignments = familyResolver.resolveAssignments(persons);

        Map<String, List<MemberDirectoryRow>> groupedRows = new LinkedHashMap<>();
        Map<String, FamilyAssignment> groupMeta = new LinkedHashMap<>();

        for (Person person : persons) {
            FamilyAssignment assignment = assignments.get(person.getId());
            if (assignment == null) {
                continue;
            }
            groupMeta.putIfAbsent(assignment.groupKey(), assignment);
            groupedRows.computeIfAbsent(assignment.groupKey(), k -> new ArrayList<>())
                    .add(toMemberDirectoryRow(person, assignment.familyNumber()));
        }

        List<MemberDirectoryFamilyGroup> families = groupedRows.entrySet().stream()
                .map(entry -> {
                    FamilyAssignment meta = groupMeta.get(entry.getKey());
                    List<MemberDirectoryRow> members = entry.getValue().stream()
                            .sorted(Comparator
                                    .comparing((MemberDirectoryRow r) -> r.getLastName() != null ? r.getLastName() : "",
                                            String.CASE_INSENSITIVE_ORDER)
                                    .thenComparing(r -> r.getFirstName() != null ? r.getFirstName() : "",
                                            String.CASE_INSENSITIVE_ORDER))
                            .collect(Collectors.toList());
                    return new MemberDirectoryFamilyGroup(
                            entry.getKey(),
                            meta != null ? meta.familyNumber() : null,
                            meta != null ? meta.familyLabel() : null,
                            members);
                })
                .sorted(Comparator.comparing(g -> g.getFamilyLabel() != null ? g.getFamilyLabel() : "",
                        String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());

        List<MemberDirectoryRow> rows = families.stream()
                .flatMap(f -> f.getMembers().stream())
                .collect(Collectors.toList());

        long deceasedMembers = persons.stream().filter(this::isDeceased).count();
        long aliveMembers = persons.size() - deceasedMembers;

        return new MemberDirectoryReportDTO(rows.size(), families.size(), aliveMembers, deceasedMembers, families, rows);
    }

    private boolean isDeceased(Person person) {
        return person.getDateOfDeath() != null || person.getStatus() == PersonStatus.DECEASED;
    }

    private MemberDirectoryRow toMemberDirectoryRow(Person person, String familyNumber) {
        MemberDirectoryRow row = new MemberDirectoryRow();
        row.setPersonId(person.getId());
        row.setFirstName(PersonNameUtil.normalize(person.getFirstName()));
        row.setLastName(PersonNameUtil.normalize(person.getLastName()));
        row.setFamilyNumber(familyNumber);
        row.setDateOfBirth(person.getDateOfBirth());
        row.setDateOfDeath(person.getDateOfDeath());
        row.setAge(calculateAge(person.getDateOfBirth(), person.getDateOfDeath()));
        row.setAddress(person.getAddress());
        row.setPhone(person.getPhone());
        row.setIdNumber(person.getIdNumber());
        row.setEmail(person.getEmail());
        row.setCivilState(person.getCivilState());
        row.setGender(person.getGender());
        return row;
    }

    private Integer calculateAge(LocalDate dateOfBirth, LocalDate dateOfDeath) {
        if (dateOfBirth == null) {
            return null;
        }
        LocalDate endDate = dateOfDeath != null ? dateOfDeath : LocalDate.now();
        if (endDate.isBefore(dateOfBirth)) {
            return null;
        }
        return Period.between(dateOfBirth, endDate).getYears();
    }
}

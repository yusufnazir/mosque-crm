package com.mosque.crm.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.ContributionType;
import com.mosque.crm.entity.ContributionTypeTranslation;
import com.mosque.crm.entity.MemberPayment;
import com.mosque.crm.entity.Membership;
import com.mosque.crm.entity.Person;
import com.mosque.crm.repository.ContributionTypeRepository;
import com.mosque.crm.repository.MemberPaymentRepository;
import com.mosque.crm.repository.MembershipRepository;
import com.mosque.crm.repository.PersonRepository;

/**
 * DataExportService — Generates Excel workbooks containing the canonical
 * export format for members, memberships, payments, and contribution types.
 *
 * This canonical format is also the target format for re-import, so the
 * column names here are authoritative.
 */
@Service
public class DataExportService {

    private static final Logger log = LoggerFactory.getLogger(DataExportService.class);

    private final PersonRepository personRepository;
    private final MembershipRepository membershipRepository;
    private final MemberPaymentRepository memberPaymentRepository;
    private final ContributionTypeRepository contributionTypeRepository;

    public DataExportService(PersonRepository personRepository,
                             MembershipRepository membershipRepository,
                             MemberPaymentRepository memberPaymentRepository,
                             ContributionTypeRepository contributionTypeRepository) {
        this.personRepository = personRepository;
        this.membershipRepository = membershipRepository;
        this.memberPaymentRepository = memberPaymentRepository;
        this.contributionTypeRepository = contributionTypeRepository;
    }

    // -------------------------------------------------------------------------
    // Public export methods
    // -------------------------------------------------------------------------

    /**
     * Full export: Members + Memberships + Payments + ContributionTypes sheets.
     */
    @Transactional(readOnly = true)
    public byte[] exportFull() throws IOException {
        try (Workbook wb = new XSSFWorkbook()) {
            CellStyle headerStyle = buildHeaderStyle(wb);
            writeMembersSheet(wb, headerStyle);
            writeMembershipsSheet(wb, headerStyle);
            writePaymentsSheet(wb, headerStyle);
            writeContributionTypesSheet(wb, headerStyle);
            return toBytes(wb);
        }
    }

    /**
     * Members export: Members + Memberships sheets only.
     */
    @Transactional(readOnly = true)
    public byte[] exportMembers() throws IOException {
        try (Workbook wb = new XSSFWorkbook()) {
            CellStyle headerStyle = buildHeaderStyle(wb);
            writeMembersSheet(wb, headerStyle);
            writeMembershipsSheet(wb, headerStyle);
            return toBytes(wb);
        }
    }

    /**
     * Payments export: Payments + ContributionTypes sheets only.
     */
    @Transactional(readOnly = true)
    public byte[] exportPayments() throws IOException {
        try (Workbook wb = new XSSFWorkbook()) {
            CellStyle headerStyle = buildHeaderStyle(wb);
            writePaymentsSheet(wb, headerStyle);
            writeContributionTypesSheet(wb, headerStyle);
            return toBytes(wb);
        }
    }

    // -------------------------------------------------------------------------
    // Sheet writers
    // -------------------------------------------------------------------------

    private void writeMembersSheet(Workbook wb, CellStyle headerStyle) {
        Sheet sheet = wb.createSheet("Members");
        String[] headers = {
            "id", "first_name", "last_name", "gender",
            "date_of_birth", "date_of_death", "email", "phone",
            "address", "city", "country", "postal_code",
            "status", "id_number"
        };
        writeHeaderRow(sheet, headerStyle, headers);

        List<Person> persons = personRepository.findAll();
        int rowNum = 1;
        for (Person p : persons) {
            Row row = sheet.createRow(rowNum++);
            int col = 0;
            setCell(row, col++, p.getId());
            setCell(row, col++, p.getFirstName());
            setCell(row, col++, p.getLastName());
            setCell(row, col++, p.getGender());
            setCell(row, col++, p.getDateOfBirth());
            setCell(row, col++, p.getDateOfDeath());
            setCell(row, col++, p.getEmail());
            setCell(row, col++, p.getPhone());
            setCell(row, col++, p.getAddress());
            setCell(row, col++, p.getCity());
            setCell(row, col++, p.getCountry());
            setCell(row, col++, p.getPostalCode());
            setCell(row, col++, p.getStatus() != null ? p.getStatus().name() : null);
            setCell(row, col++, p.getIdNumber());
        }
        autoSizeColumns(sheet, headers.length);
        log.debug("Members sheet: {} rows", persons.size());
    }

    private void writeMembershipsSheet(Workbook wb, CellStyle headerStyle) {
        Sheet sheet = wb.createSheet("Memberships");
        String[] headers = {
            "id", "member_id", "first_name", "last_name",
            "membership_type", "start_date", "end_date",
            "status", "notes"
        };
        writeHeaderRow(sheet, headerStyle, headers);

        List<Membership> memberships = membershipRepository.findAll();
        int rowNum = 1;
        for (Membership m : memberships) {
            Row row = sheet.createRow(rowNum++);
            int col = 0;
            setCell(row, col++, m.getId());
            setCell(row, col++, m.getPerson() != null ? m.getPerson().getId() : null);
            setCell(row, col++, m.getPerson() != null ? m.getPerson().getFirstName() : null);
            setCell(row, col++, m.getPerson() != null ? m.getPerson().getLastName() : null);
            setCell(row, col++, m.getMembershipType() != null ? m.getMembershipType().name() : null);
            setCell(row, col++, m.getStartDate());
            setCell(row, col++, m.getEndDate());
            setCell(row, col++, m.getStatus() != null ? m.getStatus().name() : null);
            setCell(row, col++, m.getNotes());
        }
        autoSizeColumns(sheet, headers.length);
        log.debug("Memberships sheet: {} rows", memberships.size());
    }

    private void writePaymentsSheet(Workbook wb, CellStyle headerStyle) {
        Sheet sheet = wb.createSheet("Payments");
        String[] headers = {
            "id", "member_id", "first_name", "last_name",
            "contribution_type_code", "amount", "currency",
            "payment_date", "period_from", "period_to",
            "reference", "notes", "is_reversal"
        };
        writeHeaderRow(sheet, headerStyle, headers);

        List<MemberPayment> payments = memberPaymentRepository.findAllForExport();
        int rowNum = 1;
        for (MemberPayment mp : payments) {
            Row row = sheet.createRow(rowNum++);
            int col = 0;
            setCell(row, col++, mp.getId());
            setCell(row, col++, mp.getPerson() != null ? mp.getPerson().getId() : null);
            setCell(row, col++, mp.getPerson() != null ? mp.getPerson().getFirstName() : null);
            setCell(row, col++, mp.getPerson() != null ? mp.getPerson().getLastName() : null);
            setCell(row, col++, mp.getContributionType() != null ? mp.getContributionType().getCode() : null);
            setCell(row, col++, mp.getAmount() != null ? mp.getAmount().toPlainString() : null);
            setCell(row, col++, mp.getCurrency() != null ? mp.getCurrency().getCode() : null);
            setCell(row, col++, mp.getPaymentDate());
            setCell(row, col++, mp.getPeriodFrom());
            setCell(row, col++, mp.getPeriodTo());
            setCell(row, col++, mp.getReference());
            setCell(row, col++, mp.getNotes());
            setCell(row, col++, Boolean.TRUE.equals(mp.getIsReversal()) ? "true" : "false");
        }
        autoSizeColumns(sheet, headers.length);
        log.debug("Payments sheet: {} rows", payments.size());
    }

    private void writeContributionTypesSheet(Workbook wb, CellStyle headerStyle) {
        Sheet sheet = wb.createSheet("ContributionTypes");
        String[] headers = {
            "id", "code", "name_en", "name_nl",
            "is_required", "is_active"
        };
        writeHeaderRow(sheet, headerStyle, headers);

        List<ContributionType> types = contributionTypeRepository.findAllWithTranslationsAndObligations();
        int rowNum = 1;
        for (ContributionType ct : types) {
            Row row = sheet.createRow(rowNum++);
            int col = 0;
            setCell(row, col++, ct.getId());
            setCell(row, col++, ct.getCode());
            setCell(row, col++, getTranslation(ct, "en"));
            setCell(row, col++, getTranslation(ct, "nl"));
            setCell(row, col++, Boolean.TRUE.equals(ct.getIsRequired()) ? "true" : "false");
            setCell(row, col++, Boolean.TRUE.equals(ct.getIsActive()) ? "true" : "false");
        }
        autoSizeColumns(sheet, headers.length);
        log.debug("ContributionTypes sheet: {} rows", types.size());
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private String getTranslation(ContributionType ct, String locale) {
        if (ct.getTranslations() == null) return null;
        return ct.getTranslations().stream()
                .filter(t -> locale.equalsIgnoreCase(t.getLocale()))
                .map(ContributionTypeTranslation::getName)
                .findFirst()
                .orElse(null);
    }

    private void writeHeaderRow(Sheet sheet, CellStyle style, String[] headers) {
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(style);
        }
    }

    private void setCell(Row row, int col, Long value) {
        if (value != null) {
            row.createCell(col).setCellValue(value);
        } else {
            row.createCell(col).setCellValue("");
        }
    }

    private void setCell(Row row, int col, String value) {
        row.createCell(col).setCellValue(value != null ? value : "");
    }

    private void setCell(Row row, int col, LocalDate value) {
        row.createCell(col).setCellValue(value != null ? value.toString() : "");
    }

    private void autoSizeColumns(Sheet sheet, int count) {
        for (int i = 0; i < count; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private CellStyle buildHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        return style;
    }

    private byte[] toBytes(Workbook wb) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        wb.write(out);
        return out.toByteArray();
    }
}

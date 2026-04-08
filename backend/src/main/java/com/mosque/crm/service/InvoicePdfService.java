package com.mosque.crm.service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.mosque.crm.entity.SubscriptionInvoice;
import com.mosque.crm.enums.InvoiceStatus;

@Service
public class InvoicePdfService {

    private static final Logger log = LoggerFactory.getLogger(InvoicePdfService.class);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final Color COLOR_PRIMARY = new Color(4, 120, 87);    // emerald #047857
    private static final Color COLOR_GOLD    = new Color(212, 175, 55);   // gold   #D4AF37
    private static final Color COLOR_LIGHT   = new Color(250, 250, 249);  // cream  #FAFAF9
    private static final Color COLOR_HEADER_BG = new Color(4, 120, 87);
    private static final Color COLOR_ROW_ALT = new Color(240, 248, 245);

    public byte[] generate(SubscriptionInvoice invoice, String organizationName, String planName) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 50, 50, 60, 60);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            addContent(doc, invoice, organizationName, planName);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate invoice PDF for invoice id={}", invoice.getId(), e);
            throw new RuntimeException("PDF generation failed: " + e.getMessage(), e);
        }
    }

    private void addContent(Document doc, SubscriptionInvoice invoice,
            String organizationName, String planName) throws Exception {

        Font fontTitleLarge = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 26, COLOR_PRIMARY);
        Font fontTitle      = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.WHITE);
        Font fontLabel      = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY);
        Font fontValue      = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
        Font fontSmall      = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY);
        Font fontAmountLarge = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, COLOR_PRIMARY);

        // ── Title bar ────────────────────────────────────────────────────────
        PdfPTable header = new PdfPTable(2);
        header.setWidthPercentage(100);
        header.setWidths(new float[]{60f, 40f});
        header.setSpacingAfter(20f);

        PdfPCell titleCell = new PdfPCell();
        titleCell.setBackgroundColor(COLOR_HEADER_BG);
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleCell.setPadding(16f);
        Paragraph titlePara = new Paragraph("INVOICE", fontTitleLarge);
        titlePara.setFont(FontFactory.getFont(FontFactory.HELVETICA_BOLD, 26, Color.WHITE));
        titleCell.addElement(titlePara);
        if (organizationName != null && !organizationName.isBlank()) {
            Paragraph orgPara = new Paragraph(organizationName,
                    FontFactory.getFont(FontFactory.HELVETICA, 11, Color.WHITE));
            titleCell.addElement(orgPara);
        }
        header.addCell(titleCell);

        PdfPCell refCell = new PdfPCell();
        refCell.setBackgroundColor(COLOR_HEADER_BG);
        refCell.setBorder(Rectangle.NO_BORDER);
        refCell.setPadding(16f);
        refCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        refCell.addElement(new Paragraph("Invoice #" + invoice.getId(),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE)));
        if (invoice.getIssueDate() != null) {
            refCell.addElement(new Paragraph("Issued: " + invoice.getIssueDate().format(DATE_FMT),
                    FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(200, 240, 220))));
        }
        if (invoice.getDueDate() != null) {
            refCell.addElement(new Paragraph("Due: " + invoice.getDueDate().format(DATE_FMT),
                    FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(200, 240, 220))));
        }
        header.addCell(refCell);

        doc.add(header);

        // ── Details grid ─────────────────────────────────────────────────────
        PdfPTable details = new PdfPTable(4);
        details.setWidthPercentage(100);
        details.setWidths(new float[]{20f, 30f, 20f, 30f});
        details.setSpacingAfter(20f);

        addDetailRow(details, "Plan", planName != null ? planName : "—",
                "Billing Period",
                formatPeriod(invoice), fontLabel, fontValue);

        addDetailRow(details, "Period Start",
                invoice.getPeriodStart() != null ? invoice.getPeriodStart().format(DATE_FMT) : "—",
                "Period End",
                invoice.getPeriodEnd() != null ? invoice.getPeriodEnd().format(DATE_FMT) : "—",
                fontLabel, fontValue);

        doc.add(details);

        // ── Amount & status ───────────────────────────────────────────────────
        PdfPTable amountTable = new PdfPTable(2);
        amountTable.setWidthPercentage(100);
        amountTable.setWidths(new float[]{50f, 50f});
        amountTable.setSpacingAfter(20f);

        PdfPCell amountCell = new PdfPCell();
        amountCell.setBorder(Rectangle.BOX);
        amountCell.setBorderColor(COLOR_PRIMARY);
        amountCell.setPadding(14f);
        amountCell.addElement(new Paragraph("Amount Due", fontLabel));
        String amountStr = (invoice.getCurrency() != null ? invoice.getCurrency() + " " : "")
                + (invoice.getAmount() != null ? invoice.getAmount().toPlainString() : "—");
        amountCell.addElement(new Paragraph(amountStr, fontAmountLarge));
        amountTable.addCell(amountCell);

        PdfPCell statusCell = new PdfPCell();
        statusCell.setBorder(Rectangle.BOX);
        statusCell.setBorderColor(getStatusColor(invoice.getStatus()));
        statusCell.setBackgroundColor(getStatusBgColor(invoice.getStatus()));
        statusCell.setPadding(14f);
        statusCell.addElement(new Paragraph("Status",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY)));
        statusCell.addElement(new Paragraph(formatStatus(invoice.getStatus()),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, getStatusColor(invoice.getStatus()))));
        if (InvoiceStatus.PAID.equals(invoice.getStatus()) && invoice.getPaidAt() != null) {
            statusCell.addElement(new Paragraph(
                    "Paid on: " + invoice.getPaidAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm")),
                    fontSmall));
        }
        amountTable.addCell(statusCell);
        doc.add(amountTable);

        // ── Notes ─────────────────────────────────────────────────────────────
        if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
            PdfPTable notesTable = new PdfPTable(1);
            notesTable.setWidthPercentage(100);
            notesTable.setSpacingAfter(20f);
            PdfPCell notesCell = new PdfPCell();
            notesCell.setBorder(Rectangle.BOX);
            notesCell.setBorderColor(Color.LIGHT_GRAY);
            notesCell.setPadding(10f);
            notesCell.addElement(new Paragraph("Notes", fontLabel));
            notesCell.addElement(new Paragraph(invoice.getNotes(), fontValue));
            notesTable.addCell(notesCell);
            doc.add(notesTable);
        }

        // ── Footer ────────────────────────────────────────────────────────────
        Paragraph footer = new Paragraph(
                new Chunk("Generated by Mosque CRM  •  " +
                        java.time.LocalDate.now().format(DATE_FMT),
                        fontSmall));
        footer.setAlignment(Element.ALIGN_CENTER);
        doc.add(footer);
    }

    private void addDetailRow(PdfPTable table,
            String label1, String value1,
            String label2, String value2,
            Font fontLabel, Font fontValue) {
        PdfPCell lc1 = labelCell(label1, fontLabel);
        PdfPCell vc1 = valueCell(value1, fontValue);
        PdfPCell lc2 = labelCell(label2, fontLabel);
        PdfPCell vc2 = valueCell(value2, fontValue);
        table.addCell(lc1);
        table.addCell(vc1);
        table.addCell(lc2);
        table.addCell(vc2);
    }

    private PdfPCell labelCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(COLOR_ROW_ALT);
        cell.setPadding(8f);
        cell.setBorderColor(Color.LIGHT_GRAY);
        return cell;
    }

    private PdfPCell valueCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "—", font));
        cell.setPadding(8f);
        cell.setBorderColor(Color.LIGHT_GRAY);
        return cell;
    }

    private String formatPeriod(SubscriptionInvoice invoice) {
        if (invoice.getPeriodStart() != null && invoice.getPeriodEnd() != null) {
            return invoice.getPeriodStart().format(DATE_FMT) + " – " + invoice.getPeriodEnd().format(DATE_FMT);
        }
        return "—";
    }

    private String formatStatus(InvoiceStatus status) {
        if (status == null) return "—";
        return switch (status) {
            case PAID -> "PAID";
            case PENDING -> "PENDING";
            case OVERDUE -> "OVERDUE";
        };
    }

    private Color getStatusColor(InvoiceStatus status) {
        if (status == null) return Color.DARK_GRAY;
        return switch (status) {
            case PAID -> new Color(22, 101, 52);
            case PENDING -> new Color(146, 64, 14);
            case OVERDUE -> new Color(153, 27, 27);
        };
    }

    private Color getStatusBgColor(InvoiceStatus status) {
        if (status == null) return Color.WHITE;
        return switch (status) {
            case PAID -> new Color(220, 252, 231);
            case PENDING -> new Color(254, 243, 199);
            case OVERDUE -> new Color(254, 226, 226);
        };
    }
}

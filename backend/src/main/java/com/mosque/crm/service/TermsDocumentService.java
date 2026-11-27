package com.mosque.crm.service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;

/**
 * Renders the current membership terms & conditions into a simple A4 PDF that can be
 * attached to an outgoing email. The terms are authored as Markdown-ish text, so the
 * renderer understands headings ({@code #}, {@code ##}) and bullet lines ({@code - }).
 */
@Service
public class TermsDocumentService {

    private static final Logger log = LoggerFactory.getLogger(TermsDocumentService.class);

    private static final Color COLOR_PRIMARY = new Color(4, 120, 87);

    public byte[] generate(String organizationName, String title, String content) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 50, 50, 56, 56);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font orgFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY);
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, COLOR_PRIMARY);
            Font headingFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.DARK_GRAY);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10.5f, Color.DARK_GRAY);

            if (organizationName != null && !organizationName.isBlank()) {
                Paragraph org = new Paragraph(organizationName, orgFont);
                org.setSpacingAfter(4f);
                doc.add(org);
            }

            Paragraph heading = new Paragraph(title == null || title.isBlank() ? "Membership Terms & Conditions" : title, titleFont);
            heading.setSpacingAfter(16f);
            doc.add(heading);

            for (String rawLine : (content == null ? "" : content).replace("\r\n", "\n").split("\n")) {
                String line = rawLine.trim();
                if (line.isEmpty()) {
                    Paragraph spacer = new Paragraph(" ", bodyFont);
                    spacer.setSpacingAfter(4f);
                    doc.add(spacer);
                    continue;
                }
                if (line.startsWith("###")) {
                    doc.add(headingParagraph(line.replaceFirst("^#+\\s*", ""), headingFont));
                } else if (line.startsWith("##")) {
                    doc.add(headingParagraph(line.replaceFirst("^#+\\s*", ""), headingFont));
                } else if (line.startsWith("#")) {
                    doc.add(headingParagraph(line.replaceFirst("^#+\\s*", ""), headingFont));
                } else if (line.startsWith("- ") || line.startsWith("* ")) {
                    Paragraph bullet = new Paragraph("\u2022  " + line.substring(2).replace("**", ""), bodyFont);
                    bullet.setIndentationLeft(14f);
                    bullet.setSpacingAfter(3f);
                    doc.add(bullet);
                } else {
                    Paragraph paragraph = new Paragraph(line.replace("**", ""), bodyFont);
                    paragraph.setAlignment(Element.ALIGN_JUSTIFIED);
                    paragraph.setSpacingAfter(4f);
                    doc.add(paragraph);
                }
            }

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate the membership terms PDF", e);
            return null;
        }
    }

    private Paragraph headingParagraph(String text, Font font) {
        Paragraph paragraph = new Paragraph(text.replace("**", ""), font);
        paragraph.setSpacingBefore(8f);
        paragraph.setSpacingAfter(4f);
        return paragraph;
    }
}

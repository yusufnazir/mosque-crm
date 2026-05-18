package com.mosque.crm.util;

/**
 * Normalizes person name fields for display and storage.
 * Legacy Excel imports used "?" or Unicode dashes between maiden and married surnames.
 */
public final class PersonNameUtil {

    private PersonNameUtil() {
    }

    public static String normalize(String name) {
        if (name == null || name.isBlank()) {
            return name;
        }

        String result = name;

        // Legacy Excel: "Karjadrana ? Amatbahrowi"
        result = result.replaceAll("\\s+\\?\\s+", " - ");

        // Unicode dashes with surrounding whitespace: "Moentari – Djamin"
        result = result.replaceAll("\\s*[\u2013\u2014\u2212]\\s*", " - ");

        // Normalize spaced ASCII hyphens: "Moentari  -  Djamin"
        result = result.replaceAll("\\s+-\\s+", " - ");

        // Collapse repeated separators
        result = result.replaceAll("( - )+", " - ");

        return result.trim().replaceAll(" {2,}", " ");
    }
}

package com.mosque.crm.util;

import java.util.regex.Pattern;

/**
 * Phone number helpers for the WhatsApp module.
 *
 * Stored and sent numbers are always E.164 ({@code +<country><number>}). This normalizes what
 * people type in the compose screen and what WAHA reports in webhooks.
 */
public final class PhoneUtils {

    private static final Pattern ALLOWED = Pattern.compile("^[0-9+()\\-./ ]+$");
    private static final Pattern E164 = Pattern.compile("^\\+[1-9][0-9]{6,14}$");

    private PhoneUtils() {
    }

    /**
     * Normalizes a number typed by a human.
     *
     * @param raw        the input, e.g. {@code +31 6 1234 5678}, {@code 0031612345678}, {@code 31612345678}
     * @param defaultCc  country calling code (digits only) used when the input is a national number
     * @return E.164 string, or {@code null} when the input cannot be turned into a valid number
     */
    public static String toE164(String raw, String defaultCc) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty() || !ALLOWED.matcher(trimmed).matches()) {
            return null;
        }

        String compact = trimmed.replaceAll("[^0-9+]", "");
        String digits;
        if (compact.startsWith("+")) {
            digits = compact.substring(1);
        } else if (compact.startsWith("00")) {
            digits = compact.substring(2);
        } else if (compact.startsWith("0")) {
            // National format: drop the trunk zero and prefix the default country code
            if (defaultCc == null || defaultCc.isBlank()) {
                return null;
            }
            digits = defaultCc + compact.replaceFirst("^0+", "");
        } else {
            digits = compact;
        }

        String candidate = "+" + digits;
        return E164.matcher(candidate).matches() ? candidate : null;
    }

    public static boolean isValidE164(String phoneE164) {
        return phoneE164 != null && E164.matcher(phoneE164).matches();
    }

    /** Shows only the last four digits, for logs and UI hints. */
    public static String mask(String phoneE164) {
        if (phoneE164 == null || phoneE164.length() < 4) {
            return "****";
        }
        return "****" + phoneE164.substring(phoneE164.length() - 4);
    }
}

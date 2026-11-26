package com.mosque.crm.waha;

/**
 * WhatsApp chat-id handling for WAHA.
 *
 * A chat id is {@code <digits>@c.us}. This is protocol syntax, so it lives here and nowhere
 * else in the application.
 */
public final class WahaChatId {

    private static final String USER_SUFFIX = "@c.us";

    private WahaChatId() {
    }

    /** E.164 number ({@code +<country><number>}) → WAHA chat id. */
    public static String toChatId(String phoneE164) {
        String digits = digitsOf(phoneE164);
        return digits + USER_SUFFIX;
    }

    /** WAHA chat id → E.164 number ({@code +<country><number>}); {@code null} when there is no number. */
    public static String toPhoneE164(String chatId) {
        if (chatId == null || chatId.isBlank()) {
            return null;
        }
        int at = chatId.indexOf('@');
        String local = at >= 0 ? chatId.substring(0, at) : chatId;
        String digits = digitsOf(local);
        return digits.isEmpty() ? null : "+" + digits;
    }

    /** Digits only, so a jid and a stored phone number can be compared. */
    public static String digitsOf(String value) {
        return value == null ? "" : value.replaceAll("[^0-9]", "");
    }
}

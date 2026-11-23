package com.mosque.crm.dto;

/**
 * One recipient that was <em>not</em> queued, and why.
 *
 * The enqueue result used to report only counters, so an admin who saw "3 invalid" had no way
 * of knowing which members needed their phone number fixed. Every skip is now reported here
 * with the name and the value that was actually stored/typed.
 */
public class WhatsAppSkippedRecipientDTO {

    public static final class Reason {
        /** The member has no phone number at all. */
        public static final String NO_PHONE = "NO_PHONE";
        /** A number was entered but cannot be turned into a valid international number. */
        public static final String INVALID_FORMAT = "INVALID_FORMAT";
        /** The contact sent STOP / was added to the opt-out list. */
        public static final String OPT_OUT = "OPT_OUT";
        /** The same number appears twice in this batch. */
        public static final String DUPLICATE = "DUPLICATE";
        /** A message for this number is already waiting in the queue. */
        public static final String ALREADY_QUEUED = "ALREADY_QUEUED";

        private Reason() {
        }
    }

    /** Member name, or {@code null} for hand-typed recipients. */
    private String name;

    /** The value that was stored on the member (or typed in the compose box) — not normalized. */
    private String phone;

    /** One of {@link Reason}. */
    private String reason;

    /** Human readable explanation, safe to show in the UI. */
    private String detail;

    public WhatsAppSkippedRecipientDTO() {
    }

    public WhatsAppSkippedRecipientDTO(String name, String phone, String reason, String detail) {
        this.name = name;
        this.phone = phone;
        this.reason = reason;
        this.detail = detail;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
}

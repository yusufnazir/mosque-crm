package com.mosque.crm.waha;

/**
 * WAHA webhook event names.
 *
 * Subscribing to events is configuration (a channel stores its own list, the global default
 * lives in the configuration schema), but the names themselves are protocol strings and are
 * defined once, here.
 */
public final class WahaEvent {

    /** A message that arrived on the linked account (this is what inbound routing needs). */
    public static final String MESSAGE = "message";

    /** Every message, including the ones this account sent. */
    public static final String MESSAGE_ANY = "message.any";

    /** Delivery/read acknowledgements. */
    public static final String MESSAGE_ACK = "message.ack";

    /** The session changed state (connected, stopped, …). */
    public static final String SESSION_STATUS = "session.status";

    private WahaEvent() {
    }

    /** Splits a comma separated configuration value into event names, ignoring blanks. */
    public static java.util.List<String> parseList(String csv) {
        java.util.List<String> events = new java.util.ArrayList<>();
        if (csv == null) {
            return events;
        }
        for (String part : csv.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                events.add(trimmed);
            }
        }
        return events;
    }
}

package com.mosque.crm.waha;

import java.util.Locale;

/**
 * Session states reported by WAHA.
 *
 * These are the only place where the wire values live; the rest of the application compares
 * against the enum so a typo cannot silently make a session look healthy.
 */
public enum WahaSessionStatus {

    /** Logged in and able to send. */
    WORKING,
    /** Reachable, but the account still has to be linked by scanning the QR code. */
    SCAN_QR_CODE,
    /** Reachable and booting. */
    STARTING,
    /** Reachable, deliberately not running. */
    STOPPED,
    /** WAHA reports a failure for this session. */
    FAILED,
    /** WAHA answered, but with a state this build does not know. */
    UNKNOWN,
    /** The WAHA host could not be reached at all. */
    UNREACHABLE,
    /** No base URL configured yet. */
    NOT_CONFIGURED;

    /** True only when the session can actually send a message. */
    public boolean isWorking() {
        return this == WORKING;
    }

    /** Maps a wire value (any case) onto the enum. */
    public static WahaSessionStatus fromWire(String value) {
        if (value == null || value.isBlank()) {
            return UNKNOWN;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        for (WahaSessionStatus status : values()) {
            if (status.name().equals(normalized)) {
                return status;
            }
        }
        return UNKNOWN;
    }
}

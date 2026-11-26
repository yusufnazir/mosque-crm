package com.mosque.crm.waha;

/**
 * Signals a WAHA failure.
 *
 * {@code retryable} drives whether the outbound queue tries the message again: client errors
 * (bad number, session not working) are permanent, transport and 5xx errors are not.
 */
public class WahaException extends RuntimeException {

    private final boolean retryable;

    public WahaException(String message, boolean retryable, Throwable cause) {
        super(message, cause);
        this.retryable = retryable;
    }

    public WahaException(String message, boolean retryable) {
        this(message, retryable, null);
    }

    public boolean isRetryable() {
        return retryable;
    }
}

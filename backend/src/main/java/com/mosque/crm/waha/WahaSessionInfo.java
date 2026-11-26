package com.mosque.crm.waha;

/**
 * One linked WhatsApp account, as WAHA reports it.
 *
 * {@code meId} is the account's own jid as WAHA reports it — the only trustworthy way to
 * show "which number is this". It is never used as an identifier: the channel id is.
 */
public record WahaSessionInfo(String name, WahaSessionStatus status, String meId) {

    public boolean isWorking() {
        return status != null && status.isWorking();
    }
}

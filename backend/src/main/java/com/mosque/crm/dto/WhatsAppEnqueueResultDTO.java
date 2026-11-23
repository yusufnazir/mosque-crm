package com.mosque.crm.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Outcome of queueing a batch: what was accepted and what was skipped (and why).
 *
 * The counters are the quick summary; {@link #getSkipped()} names the individual recipients so
 * the admin can fix a broken phone number instead of guessing from a number.
 */
public class WhatsAppEnqueueResultDTO {

    /** Never send more than this many skip details to the UI (a 5.000-member campaign must not blow up the response). */
    public static final int MAX_SKIPPED_DETAILS = 200;

    private String campaignId;
    private int queued;
    private int skippedOptOut;
    private int skippedInvalid;
    private int skippedNoPhone;
    private int skippedDuplicate;

    /** Total number of skipped recipients (may exceed the size of {@link #skipped}). */
    private int skippedTotal;
    private boolean skippedTruncated;
    private List<WhatsAppSkippedRecipientDTO> skipped = new ArrayList<>();

    public WhatsAppEnqueueResultDTO() {
    }

    public WhatsAppEnqueueResultDTO(String campaignId) {
        this.campaignId = campaignId;
    }

    public String getCampaignId() { return campaignId; }
    public void setCampaignId(String campaignId) { this.campaignId = campaignId; }

    public int getQueued() { return queued; }
    public void setQueued(int queued) { this.queued = queued; }

    public int getSkippedOptOut() { return skippedOptOut; }
    public void setSkippedOptOut(int skippedOptOut) { this.skippedOptOut = skippedOptOut; }

    public int getSkippedInvalid() { return skippedInvalid; }
    public void setSkippedInvalid(int skippedInvalid) { this.skippedInvalid = skippedInvalid; }

    public int getSkippedNoPhone() { return skippedNoPhone; }
    public void setSkippedNoPhone(int skippedNoPhone) { this.skippedNoPhone = skippedNoPhone; }

    public int getSkippedDuplicate() { return skippedDuplicate; }
    public void setSkippedDuplicate(int skippedDuplicate) { this.skippedDuplicate = skippedDuplicate; }

    public int getSkippedTotal() { return skippedTotal; }
    public void setSkippedTotal(int skippedTotal) { this.skippedTotal = skippedTotal; }

    public boolean isSkippedTruncated() { return skippedTruncated; }
    public void setSkippedTruncated(boolean skippedTruncated) { this.skippedTruncated = skippedTruncated; }

    public List<WhatsAppSkippedRecipientDTO> getSkipped() { return skipped; }
    public void setSkipped(List<WhatsAppSkippedRecipientDTO> skipped) {
        this.skipped = skipped == null ? new ArrayList<>() : skipped;
    }

    public void incrementQueued() { this.queued++; }

    public void incrementSkippedOptOut() { this.skippedOptOut++; }

    public void incrementSkippedInvalid() { this.skippedInvalid++; }

    public void incrementSkippedNoPhone() { this.skippedNoPhone++; }

    public void incrementSkippedDuplicate() { this.skippedDuplicate++; }

    /** Records one skipped recipient (details are capped at {@link #MAX_SKIPPED_DETAILS}). */
    public void addSkipped(String name, String phone, String reason, String detail) {
        this.skippedTotal++;
        if (this.skipped.size() < MAX_SKIPPED_DETAILS) {
            this.skipped.add(new WhatsAppSkippedRecipientDTO(name, phone, reason, detail));
        } else {
            this.skippedTruncated = true;
        }
    }
}

package com.mosque.crm.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.mosque.crm.dto.WhatsAppEnqueueRequest;
import com.mosque.crm.dto.WhatsAppEnqueueResultDTO;
import com.mosque.crm.dto.WhatsAppSkippedRecipientDTO;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.WhatsAppOutboundMessage;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.util.PhoneUtils;

/**
 * Delivers an account activation / set-password link to a member who has no usable email address.
 *
 * Email stays the first choice — the caller sends it and reports whether it was attempted. When
 * it was not (or could not be), this service queues the same link as a WhatsApp message so the
 * new member still hears about their account, subject to the normal queue, caps and quiet hours.
 *
 * Every outcome is logged with the member's name and the number as stored, including the ones
 * that could not be delivered, so an admin can fix a broken phone number instead of guessing.
 */
@Service
public class AccountActivationNotifier {

    private static final Logger log = LoggerFactory.getLogger(AccountActivationNotifier.class);

    /** How the activation link reached the member. */
    public enum Channel {
        /** An email was handed to the mail service by the caller. */
        EMAIL,
        /** Queued on the WhatsApp outbox (the dispatcher sends it when the queue allows). */
        WHATSAPP,
        /** Nothing could be sent; the link has been logged for the admin to share manually. */
        MANUAL
    }

    private final WhatsAppOutboundService outboundService;
    private final WahaClient wahaClient;
    private final WahaSettingsService wahaSettings;
    private final OrganizationRepository organizationRepository;

    public AccountActivationNotifier(WhatsAppOutboundService outboundService,
                                     WahaClient wahaClient,
                                     WahaSettingsService wahaSettings,
                                     OrganizationRepository organizationRepository) {
        this.outboundService = outboundService;
        this.wahaClient = wahaClient;
        this.wahaSettings = wahaSettings;
        this.organizationRepository = organizationRepository;
    }

    /**
     * Delivers the activation link, WhatsApp-only.
     *
     * @param personName    member name, used in the message and in the log
     * @param rawPhone      the number exactly as stored on the member (may be null / invalid)
     * @param username      the login the member must use, shown in the message
     * @param activationUrl full set-password URL (already includes the token)
     * @param emailAttempted {@code true} when the caller already sent (or handed over) an email
     * @return which channel was used
     */
    public Channel deliver(String personName, String rawPhone, String username,
                           String activationUrl, boolean emailAttempted, String language, Long organizationId) {
        if (emailAttempted) {
            return Channel.EMAIL;
        }

        String who = personName == null || personName.isBlank() ? "member without a name" : personName;
        String phone = normalizePhone(rawPhone);

        if (phone == null) {
            String why = rawPhone == null || rawPhone.isBlank()
                    ? "no phone number on file"
                    : "the phone number '" + rawPhone + "' is not a valid international number";
            logManual(who, why, username, activationUrl);
            return Channel.MANUAL;
        }

        if (!wahaClient.isConfigured()) {
            logManual(who, "WhatsApp is not configured on this installation", username, activationUrl);
            return Channel.MANUAL;
        }

        try {
            WhatsAppEnqueueRequest request = new WhatsAppEnqueueRequest();
            request.setRecipientType("CUSTOM");
            request.setPhones(List.of(phone));
            request.setProfile(WhatsAppOutboundMessage.Profile.CONVERSATION);
            request.setDefaultCountryCode(wahaSettings.effective().getDefaultCountryCode());
            request.setTemplate(buildMessage(username, activationUrl, language, organizationId));

            WhatsAppEnqueueResultDTO result = outboundService.enqueue(request, null);
            if (result.getQueued() > 0) {
                String status = wahaClient.getSessionStatus();
                if (!"WORKING".equals(status)) {
                    log.warn("Activation link for {} queued on WhatsApp ({}), but the WAHA session is {} — it will be sent once the session is connected",
                            who, PhoneUtils.mask(phone), status);
                } else {
                    log.info("Activation link for {} queued on WhatsApp ({})", who, PhoneUtils.mask(phone));
                }
                return Channel.WHATSAPP;
            }

            String reason = result.getSkipped().isEmpty()
                    ? "the number could not be queued"
                    : skippedReason(result.getSkipped().get(0));
            logManual(who, "WhatsApp could not be used: " + reason, username, activationUrl);
            return Channel.MANUAL;
        } catch (Exception e) {
            log.error("Failed to queue the activation link for {} on WhatsApp: {}", who, e.getMessage(), e);
            logManual(who, "queueing the WhatsApp message failed", username, activationUrl);
            return Channel.MANUAL;
        }
    }

    private String skippedReason(WhatsAppSkippedRecipientDTO skipped) {
        if (WhatsAppSkippedRecipientDTO.Reason.NO_PHONE.equals(skipped.getReason())) {
            return "no phone number on file";
        }
        if (WhatsAppSkippedRecipientDTO.Reason.INVALID_FORMAT.equals(skipped.getReason())) {
            return "the number is not a valid international number";
        }
        if (WhatsAppSkippedRecipientDTO.Reason.OPT_OUT.equals(skipped.getReason())) {
            return "this member opted out of WhatsApp messages";
        }
        if (WhatsAppSkippedRecipientDTO.Reason.ALREADY_QUEUED.equals(skipped.getReason())) {
            return "another message for this number is already queued";
        }
        return "the number was skipped (" + skipped.getReason() + ")";
    }

    /** E.164 form of a stored number (using the configured default country code), or {@code null}. */
    public String normalizePhone(String rawPhone) {
        return PhoneUtils.toE164(rawPhone, wahaSettings.effective().getDefaultCountryCode());
    }

    /** Never lose the link: one WARN line an admin can copy out of the log. */
    private void logManual(String who, String why, String username, String activationUrl) {
        log.warn("Activation link for {} could not be delivered ({}) — share it manually. Username: {} | Link: {}",
                who, why, username, activationUrl);
    }

    private String buildMessage(String username, String activationUrl, String language, Long organizationId) {
        String organizationName = currentOrganizationName(organizationId);
        StringBuilder message = new StringBuilder();
        boolean dutch = "nl".equals(language);
        message.append(dutch ? "Hallo,\n\n" : "Hello,\n\n");
        if (!organizationName.isEmpty()) {
            message.append(organizationName).append(dutch
                    ? " heeft een ledenaccount voor u aangemaakt.\n\n"
                    : " has created a member account for you.\n\n");
        }
        if (dutch) {
            message.append("Stel uw wachtwoord in via deze link (72 uur geldig):\n");
        } else {
            message.append("Set your password with this link (valid for 72 hours):\n");
        }
        message.append(activationUrl).append("\n\n");
        if (username != null && !username.isBlank()) {
            message.append(dutch ? "Uw gebruikersnaam: " : "Your username: ").append(username);
        }
        return message.toString();
    }

    private String currentOrganizationName(Long organizationId) {
        if (organizationId == null) {
            return "";
        }
        return organizationRepository.findById(organizationId)
                .map(Organization::getName)
                .orElse("");
    }
}

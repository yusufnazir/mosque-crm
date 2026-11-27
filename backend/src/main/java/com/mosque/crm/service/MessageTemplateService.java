package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.dto.EmailAttachment;
import com.mosque.crm.dto.MessageTemplateDTO;
import com.mosque.crm.dto.MessageTemplatePlaceholderDTO;
import com.mosque.crm.dto.MessageTemplatePreviewDTO;
import com.mosque.crm.dto.MessageTemplatePreviewResultDTO;
import com.mosque.crm.dto.MessageTemplateTestRequestDTO;
import com.mosque.crm.dto.MessageTemplateTestResultDTO;
import com.mosque.crm.dto.MessageTemplateUpdateDTO;
import com.mosque.crm.dto.WhatsAppEnqueueRequest;
import com.mosque.crm.dto.WhatsAppEnqueueResultDTO;
import com.mosque.crm.dto.WhatsAppSkippedRecipientDTO;
import com.mosque.crm.entity.MembershipTermsVersion;
import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.OrganizationMessageTemplate;
import com.mosque.crm.entity.WhatsAppChannel;
import com.mosque.crm.entity.WhatsAppOutboundMessage;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.MembershipTermsVersionRepository;
import com.mosque.crm.repository.OrganizationMessageTemplateRepository;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.util.PhoneUtils;

/**
 * Organization message templates: tenants edit the text of transactional notifications
 * (currently the membership approve/reject messages) per language and choose whether the
 * message leaves as an email or as a WhatsApp message.
 *
 * Only customisations are stored; everything else resolves to the shipped defaults in
 * {@link MessageTemplateDefinitions}.
 */
@Service
@Transactional
public class MessageTemplateService {

    private static final Logger log = LoggerFactory.getLogger(MessageTemplateService.class);

    private static final Pattern PLACEHOLDER_PATTERN =
            Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_.]+)\\s*}}");

    private static final String COLOR_PRIMARY = "#047857";
    private static final String COLOR_TEXT = "#1C1917";
    private static final String COLOR_MUTED = "#6B7280";
    private static final String COLOR_BG = "#FAFAF9";

    private final OrganizationMessageTemplateRepository templateRepository;
    private final OrganizationRepository organizationRepository;
    private final MembershipTermsVersionRepository membershipTermsVersionRepository;
    private final MembershipTermsService membershipTermsService;
    private final ConfigurationService configurationService;
    private final EmailService emailService;
    private final TermsDocumentService termsDocumentService;
    private final WhatsAppOutboundService whatsAppOutboundService;
    private final WhatsAppChannelService whatsAppChannelService;
    private final WahaSettingsService wahaSettingsService;

    public MessageTemplateService(OrganizationMessageTemplateRepository templateRepository,
                                  OrganizationRepository organizationRepository,
                                  MembershipTermsVersionRepository membershipTermsVersionRepository,
                                  MembershipTermsService membershipTermsService,
                                  ConfigurationService configurationService,
                                  EmailService emailService,
                                  TermsDocumentService termsDocumentService,
                                  WhatsAppOutboundService whatsAppOutboundService,
                                  WhatsAppChannelService whatsAppChannelService,
                                  WahaSettingsService wahaSettingsService) {
        this.templateRepository = templateRepository;
        this.organizationRepository = organizationRepository;
        this.membershipTermsVersionRepository = membershipTermsVersionRepository;
        this.membershipTermsService = membershipTermsService;
        this.configurationService = configurationService;
        this.emailService = emailService;
        this.termsDocumentService = termsDocumentService;
        this.whatsAppOutboundService = whatsAppOutboundService;
        this.whatsAppChannelService = whatsAppChannelService;
        this.wahaSettingsService = wahaSettingsService;
    }

    // ==================== Read ====================

    @Transactional(readOnly = true)
    public List<MessageTemplateDTO> listForCurrentTenant() {
        Long organizationId = requireOrganizationId();
        Organization organization = getOrganization(organizationId);
        Map<String, OrganizationMessageTemplate> overrides = templateRepository
                .findByOrganizationIdOrderByTemplateKeyAscLanguageAsc(organizationId)
                .stream()
                .collect(Collectors.toMap(this::overrideKey, template -> template, (a, b) -> a));

        List<MessageTemplateDTO> result = new ArrayList<>();
        for (MessageTemplateDefinition definition : MessageTemplateDefinitions.all()) {
            for (String language : MessageTemplateDefinitions.supportedLanguages()) {
                String key = definition.getKey() + "|" + language;
                result.add(toDTO(definition, language, overrides.get(key), organization));
            }
        }
        return result;
    }

    @Transactional(readOnly = true)
    public MessageTemplateDTO getForCurrentTenant(String templateKey, String language) {
        Long organizationId = requireOrganizationId();
        Organization organization = getOrganization(organizationId);
        MessageTemplateDefinition definition = requireDefinition(templateKey);
        String lang = normalizeLanguage(language);
        OrganizationMessageTemplate override = templateRepository
                .findByOrganizationIdAndTemplateKeyAndLanguage(organizationId, definition.getKey(), lang)
                .orElse(null);
        return toDTO(definition, lang, override, organization);
    }

    public List<MessageTemplatePlaceholderDTO> placeholders(String templateKey) {
        MessageTemplateDefinition definition = requireDefinition(templateKey);
        List<MessageTemplatePlaceholderDTO> items = new ArrayList<>();
        for (String code : definition.getPlaceholderCodes()) {
            items.add(new MessageTemplatePlaceholderDTO(code, MessageTemplateDefinitions.sampleValue(code)));
        }
        return items;
    }

    public List<String> supportedLanguages() {
        return MessageTemplateDefinitions.supportedLanguages();
    }

    // ==================== Write ====================

    public MessageTemplateDTO updateForCurrentTenant(String templateKey, String language, MessageTemplateUpdateDTO dto) {
        Long organizationId = requireOrganizationId();
        Organization organization = getOrganization(organizationId);
        MessageTemplateDefinition definition = requireDefinition(templateKey);
        String lang = normalizeLanguage(language);

        String channel = normalizeChannel(dto != null ? dto.getChannel() : null,
                definition.getDefaultChannel());
        String body = dto != null ? trimToNull(dto.getBody()) : null;
        if (body == null) {
            throw new IllegalArgumentException("The message body cannot be empty.");
        }
        String subject = dto != null ? trimToNull(dto.getSubject()) : null;
        if (OrganizationMessageTemplate.CHANNEL_EMAIL.equals(channel) && subject == null) {
            // An email without a subject would be rejected by most mail clients; use the default.
            subject = definition.defaultSubject(lang);
        }
        boolean attachTerms = definition.isSupportsTermsAttachment() && dto != null && dto.isAttachTerms();
        boolean active = dto == null || dto.isActive();

        // Saving the shipped defaults back means "no customisation": drop the override so a
        // future change to the default text is picked up automatically.
        boolean equalsDefault = channel.equalsIgnoreCase(definition.getDefaultChannel())
                && normalizeBody(body).equals(normalizeBody(definition.defaultBody(channel, lang)))
                && normalizeSubject(subject, channel).equals(
                        normalizeSubject(definition.defaultSubject(lang), channel))
                && !attachTerms
                && active;

        OrganizationMessageTemplate template = templateRepository
                .findByOrganizationIdAndTemplateKeyAndLanguage(organizationId, definition.getKey(), lang)
                .orElse(null);

        if (equalsDefault) {
            if (template != null) {
                templateRepository.delete(template);
            }
            return toDTO(definition, lang, null, organization);
        }

        if (template == null) {
            template = new OrganizationMessageTemplate();
            template.setOrganizationId(organizationId);
            template.setTemplateKey(definition.getKey());
            template.setLanguage(lang);
        }
        template.setChannel(channel);
        template.setSubject(OrganizationMessageTemplate.CHANNEL_EMAIL.equals(channel) ? subject : null);
        template.setBody(body);
        template.setAttachTerms(attachTerms);
        template.setActive(active);

        OrganizationMessageTemplate saved = templateRepository.save(template);
        return toDTO(definition, lang, saved, organization);
    }

    public MessageTemplateDTO resetForCurrentTenant(String templateKey, String language) {
        Long organizationId = requireOrganizationId();
        Organization organization = getOrganization(organizationId);
        MessageTemplateDefinition definition = requireDefinition(templateKey);
        String lang = normalizeLanguage(language);
        templateRepository.deleteByOrganizationIdAndTemplateKeyAndLanguage(organizationId, definition.getKey(), lang);
        return toDTO(definition, lang, null, organization);
    }

    public void resetAllForCurrentTenant(String templateKey) {
        Long organizationId = requireOrganizationId();
        MessageTemplateDefinition definition = requireDefinition(templateKey);
        templateRepository.deleteByOrganizationIdAndTemplateKey(organizationId, definition.getKey());
    }

    // ==================== Preview ====================

    @Transactional(readOnly = true)
    public MessageTemplatePreviewResultDTO preview(String templateKey, MessageTemplatePreviewDTO dto) {
        Long organizationId = requireOrganizationId();
        Organization organization = getOrganization(organizationId);
        MessageTemplateDefinition definition = requireDefinition(templateKey);
        String language = normalizeLanguage(dto != null ? dto.getLanguage() : null);
        String channel = normalizeChannel(dto != null ? dto.getChannel() : null, definition.getDefaultChannel());

        String subject = trimToNull(dto != null ? dto.getSubject() : null);
        if (subject == null) {
            subject = definition.defaultSubject(language);
        }
        String body = trimToNull(dto != null ? dto.getBody() : null);
        if (body == null) {
            body = definition.defaultBody(channel, language);
        }

        Map<String, String> values = buildVariables(organization);
        for (String code : definition.getPlaceholderCodes()) {
            values.putIfAbsent(code, MessageTemplateDefinitions.sampleValue(code));
        }
        if (dto != null && dto.getVariables() != null) {
            values.putAll(dto.getVariables());
        }

        MessageTemplatePreviewResultDTO result = new MessageTemplatePreviewResultDTO();
        result.setChannel(channel);
        result.setVariables(values);
        result.setBody(render(body, values, true));
        if (OrganizationMessageTemplate.CHANNEL_EMAIL.equals(channel)) {
            result.setSubject(render(subject, values, true));
            boolean showTerms = dto != null && dto.isAttachTerms();
            result.setHtml(buildEmailHtml(organization, result.getBody(), showTerms, language));
        } else {
            if (dto != null && dto.isAttachTerms()) {
                EmailAttachment attachment = termsAttachment(organization, language);
                boolean dutch = "nl".equals(language);
                result.setBody(result.getBody() + "\n\n" + (attachment != null
                        ? (dutch ? "Bijlage: " : "Attachment: ") + attachment.getFilename()
                        : (dutch ? "Geen actieve voorwaarden gevonden." : "No active terms found.")));
            }
        }
        return result;
    }

    // ==================== Resolve + render ====================

    @Transactional(readOnly = true)
    public ResolvedTemplate resolve(String templateKey, Long organizationId, String language) {
        MessageTemplateDefinition definition = requireDefinition(templateKey);
        String lang = normalizeLanguage(language);
        OrganizationMessageTemplate override = templateRepository
                .findByOrganizationIdAndTemplateKeyAndLanguage(organizationId, definition.getKey(), lang)
                .orElse(null);

        ResolvedTemplate resolved = new ResolvedTemplate();
        resolved.setKey(definition.getKey());
        resolved.setLanguage(lang);
        if (override == null) {
            resolved.setChannel(definition.getDefaultChannel());
            resolved.setSubject(definition.defaultSubject(lang));
            resolved.setBody(definition.defaultBody(definition.getDefaultChannel(), lang));
            resolved.setAttachTerms(false);
            resolved.setActive(true);
            resolved.setCustomized(false);
        } else {
            String channel = normalizeChannel(override.getChannel(), definition.getDefaultChannel());
            resolved.setChannel(channel);
            resolved.setSubject(trimToNull(override.getSubject()) != null
                    ? override.getSubject()
                    : definition.defaultSubject(lang));
            resolved.setBody(trimToNull(override.getBody()) != null
                    ? override.getBody()
                    : definition.defaultBody(channel, lang));
            resolved.setAttachTerms(override.isAttachTerms());
            resolved.setActive(override.isActive());
            resolved.setCustomized(true);
        }
        return resolved;
    }

    public Map<String, String> buildVariables(Organization organization) {
        Map<String, String> values = new LinkedHashMap<>();
        if (organization != null) {
            values.put("organization.name", safe(organization.getName()));
            values.put("organization.shortName", safe(organization.getShortName()));
            values.put("organization.address", safe(organization.getAddress()));
            values.put("organization.city", safe(organization.getCity()));
            values.put("organization.country", safe(organization.getCountry()));
            values.put("organization.postalCode", safe(organization.getPostalCode()));
            values.put("organization.phone", safe(organization.getPhone()));
            values.put("organization.email", safe(organization.getEmail()));
            values.put("organization.website", safe(organization.getWebsite()));
        }
        values.put("app.name", safe(configurationService.getAppName()));
        return values;
    }

    /**
     * Replaces {@code {{placeholders}}}. Unknown placeholders are removed for real messages
     * (a recipient should never see {{...}}) but kept in previews so the editor can spot a typo.
     */
    public String render(String text, Map<String, String> values, boolean keepUnknown) {
        if (text == null || text.isEmpty()) {
            return "";
        }
        Matcher matcher = PLACEHOLDER_PATTERN.matcher(text);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String code = matcher.group(1);
            String value = values == null ? null : values.get(code);
            if (value == null) {
                value = keepUnknown ? matcher.group(0) : "";
            }
            matcher.appendReplacement(out, Matcher.quoteReplacement(value));
        }
        matcher.appendTail(out);
        return out.toString().replace("\r\n", "\n");
    }

    // ==================== Delivery ====================

    /**
     * Sends a template over the channel its tenant configuration selects.
     *
     * @param recipientName used only in logs
     * @param toEmail       applicant email, may be {@code null}
     * @param toPhone       applicant phone, may be {@code null}
     * @param extras        additional placeholder values (person.*, activation.url, ...)
     */
    public DeliveryResult dispatch(String templateKey, Organization organization, String language,
                                   String recipientName, String toEmail, String toPhone,
                                   Map<String, String> extras) {
        DeliveryResult result = new DeliveryResult();
        try {
            ResolvedTemplate template = resolve(templateKey, organization.getId(), language);
            if (!template.isActive()) {
                log.info("Message template '{}' is disabled for organization {} - nothing sent to {}",
                        templateKey, organization.getId(), recipientName);
                return result;
            }

            Map<String, String> values = buildVariables(organization);
            if (extras != null) {
                values.putAll(extras);
            }

            String body = render(template.getBody(), values, false).trim();

            if (OrganizationMessageTemplate.CHANNEL_WHATSAPP.equals(template.getChannel())) {
                EmailAttachment attachment = template.isAttachTerms()
                        ? termsAttachment(organization, language)
                        : null;
                result.setWhatsappQueued(queueWhatsApp(organization, toPhone, body, attachment));
                if (!result.isWhatsappQueued()) {
                    log.info("WhatsApp delivery of '{}' to {} was not possible (no usable phone number or queue rejected it)",
                            templateKey, recipientName);
                }
                return result;
            }

            if (toEmail == null || toEmail.isBlank()) {
                log.info("Message template '{}' uses email but {} has no email address", templateKey, recipientName);
                return result;
            }

            MembershipTermsVersion terms = template.isAttachTerms() ? currentTerms(organization.getId()) : null;
            String termsHtml = terms != null
                    ? convertToHtml(membershipTermsService.renderContent(termsContent(terms, language), organization))
                    : null;
            String subject = render(template.getSubject(), values, false).trim();
            String html = wrapHtml(organization, convertToHtml(body), termsHtml, language);

            List<EmailAttachment> attachments = new ArrayList<>();
            EmailAttachment termsFile = terms != null ? termsAttachment(organization, language) : null;
            if (termsFile != null) {
                attachments.add(termsFile);
            }

            result.setEmailSent(emailService.sendTemplateEmail(toEmail, subject, html, attachments));
            if (!result.isEmailSent()) {
                log.warn("Email delivery of '{}' to {} was not accepted by the mail service", templateKey, recipientName);
            }
            return result;
        } catch (Exception e) {
            log.error("Failed to dispatch message template '{}' to {}: {}", templateKey, recipientName, e.getMessage(), e);
            return result;
        }
    }

    public String buildEmailHtml(Organization organization, String bodyText, boolean attachTerms, String language) {
        MembershipTermsVersion terms = attachTerms ? currentTerms(organization.getId()) : null;
        String termsHtml = terms != null
                ? convertToHtml(membershipTermsService.renderContent(termsContent(terms, language), organization))
                : null;
        return wrapHtml(organization, convertToHtml(bodyText), termsHtml, language);
    }

    // ==================== Test send ====================

    /**
     * Sends the (possibly unsaved) template to a supplied address/number so an admin can verify
     * that the mail service, the placeholders and the terms attachment really work.
     *
     * Placeholders are filled with the same sample values the editor previews, and the message is
     * marked as a test so a real recipient is never confused.
     */
    public MessageTemplateTestResultDTO sendTest(String templateKey, MessageTemplateTestRequestDTO request) {
        Long organizationId = requireOrganizationId();
        Organization organization = getOrganization(organizationId);
        MessageTemplateDefinition definition = requireDefinition(templateKey);
        String language = normalizeLanguage(request != null ? request.getLanguage() : null);
        String channel = normalizeChannel(request != null ? request.getChannel() : null, definition.getDefaultChannel());
        boolean dutch = "nl".equalsIgnoreCase(language);

        MessageTemplateTestResultDTO result = new MessageTemplateTestResultDTO();
        result.setChannel(channel);

        Map<String, String> values = buildVariables(organization);
        for (String code : definition.getPlaceholderCodes()) {
            values.putIfAbsent(code, MessageTemplateDefinitions.sampleValue(code));
        }

        String subjectDraft = request != null ? trimToNull(request.getSubject()) : null;
        if (subjectDraft == null) {
            subjectDraft = definition.defaultSubject(language);
        }
        String bodyDraft = request != null ? trimToNull(request.getBody()) : null;
        if (bodyDraft == null) {
            bodyDraft = definition.defaultBody(channel, language);
        }

        String renderedSubject = render(subjectDraft, values, false).trim();
        String renderedBody = render(bodyDraft, values, false).trim();

        if (OrganizationMessageTemplate.CHANNEL_WHATSAPP.equals(channel)) {
            boolean attachRequested = request != null && request.isAttachTerms()
                    && definition.isSupportsTermsAttachment();
            EmailAttachment attachment = attachRequested ? termsAttachment(organization, language) : null;
            MembershipTermsVersion activeTerms = attachRequested ? currentTerms(organization.getId()) : null;
            boolean termsLanguageMissing = activeTerms != null && termsLanguageMissing(activeTerms, language);
            return sendWhatsAppTest(request, renderedBody, attachRequested, attachment,
                    termsLanguageMissing, result, dutch);
        }
        return sendEmailTest(request, organization, definition, language, renderedSubject, renderedBody, result, dutch);
    }

    private MessageTemplateTestResultDTO sendWhatsAppTest(MessageTemplateTestRequestDTO request, String renderedBody,
                                                          boolean attachRequested, EmailAttachment attachment,
                                                          boolean termsLanguageMissing,
                                                          MessageTemplateTestResultDTO result, boolean dutch) {
        String rawPhone = request != null ? trimToNull(request.getToPhone()) : null;
        if (rawPhone == null) {
            result.setStatus(MessageTemplateTestResultDTO.STATUS_NO_RECIPIENT);
            result.setMessage(dutch
                    ? "Voer een telefoonnummer in om de test naar te versturen."
                    : "Enter a phone number to send the test to.");
            return result;
        }

        String phone = normalizeWhatsAppPhone(rawPhone);
        if (phone == null) {
            result.setStatus(MessageTemplateTestResultDTO.STATUS_FAILED);
            result.setMessage(dutch
                    ? "Het nummer '" + rawPhone + "' is geen geldig internationaal nummer."
                    : "'" + rawPhone + "' is not a valid international number.");
            return result;
        }
        result.setRecipient(phone);

        String body = (dutch ? "Testbericht - er is geen actie nodig.\n\n" : "Test message - no action required.\n\n")
                + renderedBody;
        boolean termsIncluded = attachment != null;
        String termsNote = "";
        if (termsIncluded) {
            termsNote = dutch
                    ? " De lidmaatschapsvoorwaarden zijn als document bijgevoegd."
                    : " The membership terms are attached as a document.";
            if (termsLanguageMissing) {
                termsNote += dutch
                        ? " Deze versie heeft geen Nederlandse vertaling; de Engelse tekst is gebruikt."
                        : " This version has no translation for the selected language, so the default text was used.";
            }
        } else if (attachRequested) {
            termsNote = dutch
                    ? " Er is geen actieve versie van de voorwaarden gevonden, dus er is geen document bijgevoegd."
                    : " No active membership terms version was found, so no document was attached.";
        }
        try {
            WhatsAppEnqueueResultDTO enqueued = enqueueWhatsApp(phone, body, attachment);
            if (enqueued.getQueued() > 0) {
                result.setStatus(MessageTemplateTestResultDTO.STATUS_QUEUED);
                result.setDelivered(true);
                result.setMessage((dutch
                        ? "Testbericht in de wachtrij geplaatst voor " + phone + ". De verzender verstuurt het binnen enkele seconden."
                        : "Test message queued for " + phone + ". The dispatcher sends it within a few seconds.") + termsNote);
            } else {
                String reason = enqueued.getSkipped().isEmpty()
                        ? (dutch ? "het bericht kon niet in de wachtrij worden geplaatst"
                                 : "the message could not be queued")
                        : describeSkip(enqueued.getSkipped().get(0), dutch);
                result.setStatus(MessageTemplateTestResultDTO.STATUS_SKIPPED);
                result.setMessage(dutch ? "Niet verstuurd: " + reason + "." : "Not sent: " + reason + ".");
            }
        } catch (Exception e) {
            result.setStatus(MessageTemplateTestResultDTO.STATUS_FAILED);
            result.setMessage(dutch
                    ? "WhatsApp is niet beschikbaar: " + e.getMessage()
                    : "WhatsApp is not available: " + e.getMessage());
        }
        return result;
    }

    private MessageTemplateTestResultDTO sendEmailTest(MessageTemplateTestRequestDTO request, Organization organization,
                                                       MessageTemplateDefinition definition, String language,
                                                       String renderedSubject, String renderedBody,
                                                       MessageTemplateTestResultDTO result, boolean dutch) {
        String toEmail = request != null ? trimToNull(request.getToEmail()) : null;
        if (toEmail == null) {
            result.setStatus(MessageTemplateTestResultDTO.STATUS_NO_RECIPIENT);
            result.setMessage(dutch
                    ? "Voer een e-mailadres in om de test naar te versturen."
                    : "Enter an email address to send the test to.");
            return result;
        }
        result.setRecipient(toEmail);

        String host = configurationService.getMailServerHost();
        if (host == null || host.isBlank()) {
            result.setStatus(MessageTemplateTestResultDTO.STATUS_NOT_CONFIGURED);
            result.setMessage(dutch
                    ? "Er is geen mailserver geconfigureerd, dus er is niets verstuurd."
                    : "No mail server is configured, so nothing was sent.");
            return result;
        }

        boolean attachRequested = request != null && request.isAttachTerms()
                && definition.isSupportsTermsAttachment();
        MembershipTermsVersion terms = attachRequested ? currentTerms(organization.getId()) : null;
        String termsHtml = terms != null
                ? convertToHtml(membershipTermsService.renderContent(termsContent(terms, language), organization))
                : null;

        List<EmailAttachment> attachments = new ArrayList<>();
        EmailAttachment termsFile = terms != null ? termsAttachment(organization, language) : null;
        if (termsFile != null) {
            attachments.add(termsFile);
        }

        String html = wrapHtml(organization, testBanner(language) + convertToHtml(renderedBody), termsHtml, language);
        boolean sent = emailService.sendTemplateEmail(toEmail, "[Test] " + renderedSubject, html, attachments);

        if (!sent) {
            result.setStatus(MessageTemplateTestResultDTO.STATUS_FAILED);
            result.setMessage(dutch
                    ? "De mailservice heeft het bericht niet geaccepteerd. Controleer de mailserverinstellingen en de backend-log."
                    : "The mail service did not accept the message. Check the mail server settings and the backend log.");
            return result;
        }

        result.setStatus(MessageTemplateTestResultDTO.STATUS_SENT);
        result.setDelivered(true);
        StringBuilder message = new StringBuilder(dutch
                ? "Testbericht verzonden naar " + toEmail
                : "Test message sent to " + toEmail);
        if (terms != null) {
            message.append(dutch
                    ? " met de lidmaatschapsvoorwaarden (v" + terms.getVersionNumber() + ") als bijlage."
                    : " with the membership terms (v" + terms.getVersionNumber() + ") attached.");
            if (termsLanguageMissing(terms, language)) {
                message.append(dutch
                        ? " Deze versie heeft geen Nederlandse vertaling; de Engelse tekst is gebruikt."
                        : " This version has no translation for the selected language, so the default text was used.");
            }
        } else if (attachRequested) {
            message.append(dutch
                    ? ". Er is geen actieve versie van de voorwaarden gevonden, dus er is geen bijlage toegevoegd."
                    : ". No active membership terms version was found, so no attachment was added.");
        } else {
            message.append(".");
        }
        result.setMessage(message.toString());
        return result;
    }

    private String describeSkip(WhatsAppSkippedRecipientDTO skipped, boolean dutch) {
        String reason = skipped.getReason();
        if (WhatsAppSkippedRecipientDTO.Reason.NO_PHONE.equals(reason)) {
            return dutch ? "er is geen telefoonnummer opgegeven" : "no phone number was provided";
        }
        if (WhatsAppSkippedRecipientDTO.Reason.INVALID_FORMAT.equals(reason)) {
            return dutch ? "het nummer is geen geldig internationaal nummer" : "the number is not a valid international number";
        }
        if (WhatsAppSkippedRecipientDTO.Reason.OPT_OUT.equals(reason)) {
            return dutch ? "dit nummer heeft zich afgemeld voor WhatsApp-berichten"
                         : "this number opted out of WhatsApp messages";
        }
        if (WhatsAppSkippedRecipientDTO.Reason.ALREADY_QUEUED.equals(reason)) {
            return dutch ? "er staat al een bericht voor dit nummer in de wachtrij"
                         : "another message for this number is already queued";
        }
        return dutch ? "het nummer is overgeslagen (" + reason + ")" : "the number was skipped (" + reason + ")";
    }

    private String testBanner(String language) {
        boolean dutch = "nl".equalsIgnoreCase(language);
        return "<div style=\"background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;font-size:12px;"
                + "line-height:1.5;padding:10px 12px;border-radius:6px;margin-bottom:16px;\">"
                + (dutch ? "Testbericht &ndash; er is geen actie nodig." : "Test message &ndash; no action required.")
                + "</div>";
    }

    // ==================== WhatsApp ====================

    private boolean queueWhatsApp(Organization organization, String rawPhone, String body, EmailAttachment attachment) {
        if (body == null || body.isBlank()) {
            return false;
        }
        String phone = normalizeWhatsAppPhone(rawPhone);
        if (phone == null) {
            return false;
        }
        try {
            return enqueueWhatsApp(phone, body, attachment).getQueued() > 0;
        } catch (Exception e) {
            log.warn("Could not queue the WhatsApp message: {}", e.getMessage());
            return false;
        }
    }

    private String normalizeWhatsAppPhone(String rawPhone) {
        return PhoneUtils.toE164(rawPhone, wahaSettingsService.effective().getDefaultCountryCode());
    }

    private WhatsAppEnqueueResultDTO enqueueWhatsApp(String phone, String body, EmailAttachment attachment) throws Exception {
        WhatsAppChannel channel = whatsAppChannelService.requireChannel(null, WhatsAppChannelService.FLOW_NOTIFICATIONS);
        WhatsAppEnqueueRequest request = new WhatsAppEnqueueRequest();
        request.setRecipientType("CUSTOM");
        request.setPhones(List.of(phone));
        request.setChannelId(channel.getId());
        request.setProfile(WhatsAppOutboundMessage.Profile.CONVERSATION);
        request.setDefaultCountryCode(wahaSettingsService.effective().getDefaultCountryCode());
        request.setTemplate(body);
        if (attachment != null) {
            request.setMediaFilename(attachment.getFilename());
            request.setMediaMimetype(attachment.getContentType());
            request.setMediaBase64(attachment.getBase64Content());
        }
        return whatsAppOutboundService.enqueue(request, null);
    }

    // ==================== HTML ====================

    private String wrapHtml(Organization organization, String bodyHtml, String termsHtml, String language) {
        boolean dutch = "nl".equalsIgnoreCase(language);
        String orgName = organization != null && organization.getName() != null
                ? escapeHtml(organization.getName())
                : "";

        StringBuilder footer = new StringBuilder();
        if (organization != null) {
            if (organization.getWebsite() != null && !organization.getWebsite().isBlank()) {
                footer.append("<a href=\"").append(escapeHtml(organization.getWebsite()))
                        .append("\" style=\"color:").append(COLOR_PRIMARY).append(";text-decoration:none;\">")
                        .append(escapeHtml(organization.getWebsite())).append("</a>");
            }
            if (organization.getEmail() != null && !organization.getEmail().isBlank()) {
                if (footer.length() > 0) {
                    footer.append(" &middot; ");
                }
                footer.append(escapeHtml(organization.getEmail()));
            }
        }

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:")
                .append(COLOR_BG).append(";font-family:Arial,Helvetica,sans-serif;\">")
                .append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:")
                .append(COLOR_BG).append(";\"><tr><td align=\"center\" style=\"padding:24px 12px;\">")
                .append("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" ")
                .append("style=\"width:600px;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;\">");

        if (!orgName.isEmpty()) {
            html.append("<tr><td style=\"background:").append(COLOR_PRIMARY)
                    .append(";padding:20px 28px;color:#ffffff;font-size:18px;font-weight:bold;\">")
                    .append(orgName).append("</td></tr>");
        }

        html.append("<tr><td style=\"padding:28px;color:").append(COLOR_TEXT)
                .append(";font-size:15px;line-height:1.65;\">").append(bodyHtml).append("</td></tr>");

        if (termsHtml != null) {
            html.append("<tr><td style=\"padding:0 28px 28px;\">")
                    .append("<div style=\"border-top:1px solid #e5e7eb;padding-top:18px;\">")
                    .append("<div style=\"font-size:13px;font-weight:bold;color:").append(COLOR_PRIMARY)
                    .append(";margin-bottom:8px;\">")
                    .append(dutch ? "Lidmaatschapsvoorwaarden" : "Membership terms &amp; conditions")
                    .append("</div>")
                    .append("<div style=\"font-size:12px;line-height:1.6;color:").append(COLOR_MUTED).append(";\">")
                    .append(termsHtml).append("</div></div></td></tr>");
        }

        html.append("<tr><td style=\"padding:16px 28px;border-top:1px solid #e5e7eb;color:")
                .append(COLOR_MUTED).append(";font-size:12px;\">").append(footer).append("</td></tr>");
        html.append("</table></td></tr></table></body></html>");
        return html.toString();
    }

    /** Minimal Markdown rendering: paragraphs, line breaks, bold and links. */
    private String convertToHtml(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String escaped = escapeHtml(text.replace("\r\n", "\n"));
        escaped = escaped.replaceAll("\\*\\*([^*]+)\\*\\*", "<strong>$1</strong>");
        escaped = escaped.replaceAll("\\[([^\\]]+)]\\((https?://[^)\\s]+)\\)",
                "<a href=\"$2\" style=\"color:" + COLOR_PRIMARY + ";text-decoration:none;\">$1</a>");

        String[] paragraphs = escaped.split("\n{2,}");
        StringBuilder out = new StringBuilder();
        for (String paragraph : paragraphs) {
            String trimmed = paragraph.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            out.append("<p style=\"margin:0 0 12px;\">")
                    .append(trimmed.replace("\n", "<br/>"))
                    .append("</p>");
        }
        return out.toString();
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    // ==================== Helpers ====================

    private MembershipTermsVersion currentTerms(Long organizationId) {
        return membershipTermsVersionRepository
                .findFirstByOrganizationIdAndActiveTrueOrderByVersionNumberDesc(organizationId)
                .orElse(null);
    }

    /**
     * The active membership terms rendered to PDF, ready to attach to an email or a WhatsApp
     * document. Returns {@code null} when there is no active version (or PDF generation failed).
     */
    private EmailAttachment termsAttachment(Organization organization, String language) {
        MembershipTermsVersion terms = currentTerms(organization.getId());
        if (terms == null) {
            return null;
        }
        byte[] pdf = termsDocumentService.generate(organization.getName(), localizedTermsTitle(terms, language),
                membershipTermsService.renderContent(termsContent(terms, language), organization));
        if (pdf == null) {
            return null;
        }
        String filename = ("nl".equalsIgnoreCase(language) ? "lidmaatschapsvoorwaarden" : "membership-terms")
                + "-v" + terms.getVersionNumber() + ".pdf";
        return new EmailAttachment(
                filename,
                "application/pdf",
                Base64.getEncoder().encodeToString(pdf));
    }

    /** The terms title in the requested language (falls back to the default title). */
    private String localizedTermsTitle(MembershipTermsVersion terms, String language) {
        if ("nl".equalsIgnoreCase(language) && terms.getTitleNl() != null && !terms.getTitleNl().isBlank()) {
            return terms.getTitleNl();
        }
        return terms.getTitle();
    }

    /** true when the requested language is not available for this terms version. */
    private boolean termsLanguageMissing(MembershipTermsVersion terms, String language) {
        return "nl".equalsIgnoreCase(language)
                && (terms.getContentNl() == null || terms.getContentNl().isBlank());
    }

    private String termsContent(MembershipTermsVersion terms, String language) {
        if ("nl".equalsIgnoreCase(language) && terms.getContentNl() != null && !terms.getContentNl().isBlank()) {
            return terms.getContentNl();
        }
        return terms.getContent();
    }

    private MessageTemplateDTO toDTO(MessageTemplateDefinition definition, String language,
                                     OrganizationMessageTemplate override, Organization organization) {
        String channel = override != null
                ? normalizeChannel(override.getChannel(), definition.getDefaultChannel())
                : definition.getDefaultChannel();

        MessageTemplateDTO dto = new MessageTemplateDTO();
        dto.setKey(definition.getKey());
        dto.setName(definition.getName());
        dto.setDescription(definition.getDescription());
        dto.setCategory(definition.getCategory());
        dto.setLanguage(language);
        dto.setDefaultChannel(definition.getDefaultChannel());
        dto.setDefaultSubject(definition.defaultSubject(language));
        dto.setDefaultBody(definition.defaultBody(channel, language));
        dto.setSupportsTermsAttachment(definition.isSupportsTermsAttachment());
        dto.setPlaceholders(placeholders(definition.getKey()));

        if (override == null) {
            dto.setChannel(definition.getDefaultChannel());
            dto.setSubject(definition.defaultSubject(language));
            dto.setBody(definition.defaultBody(definition.getDefaultChannel(), language));
            dto.setAttachTerms(false);
            dto.setActive(true);
            dto.setCustomized(false);
        } else {
            dto.setChannel(channel);
            dto.setSubject(trimToNull(override.getSubject()) != null
                    ? override.getSubject()
                    : definition.defaultSubject(language));
            dto.setBody(trimToNull(override.getBody()) != null
                    ? override.getBody()
                    : definition.defaultBody(channel, language));
            dto.setAttachTerms(override.isAttachTerms());
            dto.setActive(override.isActive());
            dto.setCustomized(true);
            dto.setUpdatedAt(override.getUpdatedAt());
        }

        return dto;
    }

    private String overrideKey(OrganizationMessageTemplate template) {
        return template.getTemplateKey() + "|" + template.getLanguage();
    }

    private MessageTemplateDefinition requireDefinition(String templateKey) {
        return MessageTemplateDefinitions.find(templateKey)
                .orElseThrow(() -> new IllegalArgumentException("Unknown message template: " + templateKey));
    }

    private String normalizeLanguage(String language) {
        return language != null && "nl".equalsIgnoreCase(language)
                ? MessageTemplateDefinitions.LANGUAGE_NL
                : MessageTemplateDefinitions.LANGUAGE_EN;
    }

    private String normalizeChannel(String channel, String fallback) {
        if (channel == null || channel.isBlank()) {
            return fallback;
        }
        String normalized = channel.trim().toUpperCase(Locale.ROOT);
        if (!OrganizationMessageTemplate.CHANNEL_EMAIL.equals(normalized)
                && !OrganizationMessageTemplate.CHANNEL_WHATSAPP.equals(normalized)) {
            throw new IllegalArgumentException("Unsupported channel: " + channel);
        }
        return normalized;
    }

    private String normalizeBody(String body) {
        return body == null ? "" : body.replace("\r\n", "\n").trim();
    }

    private String normalizeSubject(String subject, String channel) {
        if (OrganizationMessageTemplate.CHANNEL_WHATSAPP.equals(channel)) {
            return "";
        }
        return subject == null ? "" : subject.trim();
    }

    private Long requireOrganizationId() {
        Long organizationId = TenantContext.getCurrentOrganizationId();
        if (organizationId == null) {
            throw new IllegalStateException("No organization context found.");
        }
        return organizationId;
    }

    private Organization getOrganization(Long organizationId) {
        return organizationRepository.findById(organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + organizationId));
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Effective template text, ready to be rendered. */
    public static class ResolvedTemplate {
        private String key;
        private String language;
        private String channel;
        private String subject;
        private String body;
        private boolean attachTerms;
        private boolean active;
        private boolean customized;

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }

        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }

        public String getChannel() { return channel; }
        public void setChannel(String channel) { this.channel = channel; }

        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }

        public String getBody() { return body; }
        public void setBody(String body) { this.body = body; }

        public boolean isAttachTerms() { return attachTerms; }
        public void setAttachTerms(boolean attachTerms) { this.attachTerms = attachTerms; }

        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }

        public boolean isCustomized() { return customized; }
        public void setCustomized(boolean customized) { this.customized = customized; }

        public boolean isEmailChannel() {
            return OrganizationMessageTemplate.CHANNEL_EMAIL.equals(channel);
        }

        public Optional<String> emailSubject() {
            return isEmailChannel() ? Optional.ofNullable(subject) : Optional.empty();
        }
    }

    /** Which channels a template dispatch actually used. */
    public static class DeliveryResult {
        private boolean emailSent;
        private boolean whatsappQueued;

        public boolean isEmailSent() { return emailSent; }
        public void setEmailSent(boolean emailSent) { this.emailSent = emailSent; }

        public boolean isWhatsappQueued() { return whatsappQueued; }
        public void setWhatsappQueued(boolean whatsappQueued) { this.whatsappQueued = whatsappQueued; }

        public boolean isDelivered() { return emailSent || whatsappQueued; }
    }
}

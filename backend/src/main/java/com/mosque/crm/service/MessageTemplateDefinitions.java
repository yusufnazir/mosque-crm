package com.mosque.crm.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.mosque.crm.entity.OrganizationMessageTemplate;

/**
 * The catalogue of message templates the organization settings can edit, including the
 * default texts. Adding a new template means adding one definition here; no migration is
 * needed because tenants only get a database row when they change something.
 */
public final class MessageTemplateDefinitions {

    public static final String JOIN_REQUEST_APPROVED = "join_request.approved";
    public static final String JOIN_REQUEST_REJECTED = "join_request.rejected";

    public static final String CATEGORY_JOIN_REQUEST = "join_request";

    public static final String LANGUAGE_EN = "en";
    public static final String LANGUAGE_NL = "nl";

    private static final List<String> COMMON_PLACEHOLDERS = Arrays.asList(
            "organization.name",
            "organization.shortName",
            "organization.address",
            "organization.city",
            "organization.country",
            "organization.postalCode",
            "organization.phone",
            "organization.email",
            "organization.website",
            "app.name",
            "person.firstName",
            "person.lastName",
            "person.fullName",
            "person.email",
            "person.phone",
            "request.submittedAt");

    private static final Map<String, String> PLACEHOLDER_SAMPLES = buildSamples();

    private static final List<MessageTemplateDefinition> DEFINITIONS = buildDefinitions();

    private MessageTemplateDefinitions() {
    }

    public static List<MessageTemplateDefinition> all() {
        return DEFINITIONS;
    }

    public static Optional<MessageTemplateDefinition> find(String key) {
        if (key == null) {
            return Optional.empty();
        }
        return DEFINITIONS.stream().filter(definition -> definition.getKey().equals(key)).findFirst();
    }

    public static List<String> supportedLanguages() {
        return Arrays.asList(LANGUAGE_EN, LANGUAGE_NL);
    }

    public static String sampleValue(String code) {
        return PLACEHOLDER_SAMPLES.getOrDefault(code, "");
    }

    public static List<String> placeholdersFor(String key) {
        return find(key).map(MessageTemplateDefinition::getPlaceholderCodes).orElseGet(ArrayList::new);
    }

    private static Map<String, String> buildSamples() {
        Map<String, String> samples = new LinkedHashMap<>();
        samples.put("organization.name", "Masjid Al-Noor");
        samples.put("organization.shortName", "Al-Noor");
        samples.put("organization.address", "Palm Street 12");
        samples.put("organization.city", "Paramaribo");
        samples.put("organization.country", "Suriname");
        samples.put("organization.postalCode", "1000");
        samples.put("organization.phone", "+597 400 100");
        samples.put("organization.email", "info@masjid-alnoor.org");
        samples.put("organization.website", "https://masjid-alnoor.org");
        samples.put("app.name", "MemberFlow");
        samples.put("person.firstName", "Ahmed");
        samples.put("person.lastName", "Rahman");
        samples.put("person.fullName", "Ahmed Rahman");
        samples.put("person.email", "ahmed@example.com");
        samples.put("person.phone", "+597 700 2000");
        samples.put("request.submittedAt", "24 Nov 2026");
        samples.put("activation.url", "https://masjid-alnoor.org/reset-password?token=1f4c9b7a-sample");
        samples.put("rejection.reason", "The 2026 membership fee is still outstanding.");
        return samples;
    }

    private static List<MessageTemplateDefinition> buildDefinitions() {
        List<MessageTemplateDefinition> definitions = new ArrayList<>();
        definitions.add(approvedDefinition());
        definitions.add(rejectedDefinition());
        return definitions;
    }

    private static MessageTemplateDefinition approvedDefinition() {
        List<String> placeholders = new ArrayList<>(COMMON_PLACEHOLDERS);
        placeholders.add("activation.url");

        Map<String, String> subjects = new LinkedHashMap<>();
        subjects.put(LANGUAGE_EN, "{{organization.name}} - Your membership request was approved");
        subjects.put(LANGUAGE_NL, "{{organization.name}} - Uw lidmaatschapsaanvraag is goedgekeurd");

        Map<String, String> emailBodies = new LinkedHashMap<>();
        emailBodies.put(LANGUAGE_EN,
                "Dear {{person.firstName}},\n"
              + "\n"
              + "Good news! {{organization.name}} has approved your membership request.\n"
              + "\n"
              + "To activate your account and choose your password, open this link:\n"
              + "{{activation.url}}\n"
              + "\n"
              + "The link is valid for 72 hours. If it has expired, ask us for a new one.\n"
              + "\n"
              + "Kind regards,\n"
              + "{{organization.name}}\n"
              + "{{organization.website}}");
        emailBodies.put(LANGUAGE_NL,
                "Beste {{person.firstName}},\n"
              + "\n"
              + "Goed nieuws! {{organization.name}} heeft uw lidmaatschapsaanvraag goedgekeurd.\n"
              + "\n"
              + "Activeer uw account en kies uw wachtwoord via deze link:\n"
              + "{{activation.url}}\n"
              + "\n"
              + "De link is 72 uur geldig. Is de link verlopen? Vraag ons dan om een nieuwe.\n"
              + "\n"
              + "Met vriendelijke groet,\n"
              + "{{organization.name}}\n"
              + "{{organization.website}}");

        Map<String, String> whatsappBodies = new LinkedHashMap<>();
        whatsappBodies.put(LANGUAGE_EN,
                "Hi {{person.firstName}}, {{organization.name}} approved your membership request. "
              + "Activate your account here: {{activation.url}} (valid for 72 hours).");
        whatsappBodies.put(LANGUAGE_NL,
                "Hallo {{person.firstName}}, {{organization.name}} heeft uw lidmaatschapsaanvraag goedgekeurd. "
              + "Activeer uw account via: {{activation.url}} (72 uur geldig).");

        return new MessageTemplateDefinition(
                JOIN_REQUEST_APPROVED,
                "Membership request approved",
                "Sent to the applicant when an admin approves the membership request.",
                CATEGORY_JOIN_REQUEST,
                placeholders,
                OrganizationMessageTemplate.CHANNEL_EMAIL,
                true,
                subjects,
                emailBodies,
                whatsappBodies);
    }

    private static MessageTemplateDefinition rejectedDefinition() {
        List<String> placeholders = new ArrayList<>(COMMON_PLACEHOLDERS);
        placeholders.add("rejection.reason");

        Map<String, String> subjects = new LinkedHashMap<>();
        subjects.put(LANGUAGE_EN, "{{organization.name}} - Your membership request");
        subjects.put(LANGUAGE_NL, "{{organization.name}} - Uw lidmaatschapsaanvraag");

        Map<String, String> emailBodies = new LinkedHashMap<>();
        emailBodies.put(LANGUAGE_EN,
                "Dear {{person.firstName}},\n"
              + "\n"
              + "Thank you for your interest in {{organization.name}}.\n"
              + "\n"
              + "Unfortunately we could not approve your membership request.\n"
              + "{{rejection.reason}}\n"
              + "\n"
              + "If you believe this is a mistake or would like more information, "
              + "please contact us at {{organization.email}}.\n"
              + "\n"
              + "Kind regards,\n"
              + "{{organization.name}}");
        emailBodies.put(LANGUAGE_NL,
                "Beste {{person.firstName}},\n"
              + "\n"
              + "Bedankt voor uw interesse in {{organization.name}}.\n"
              + "\n"
              + "Helaas kunnen wij uw lidmaatschapsaanvraag niet goedkeuren.\n"
              + "{{rejection.reason}}\n"
              + "\n"
              + "Denkt u dat dit een vergissing is of wilt u meer informatie? "
              + "Neem dan contact op via {{organization.email}}.\n"
              + "\n"
              + "Met vriendelijke groet,\n"
              + "{{organization.name}}");

        Map<String, String> whatsappBodies = new LinkedHashMap<>();
        whatsappBodies.put(LANGUAGE_EN,
                "Hi {{person.firstName}}, unfortunately {{organization.name}} could not approve your membership request. "
              + "{{rejection.reason}} Questions? Contact us at {{organization.email}}.");
        whatsappBodies.put(LANGUAGE_NL,
                "Hallo {{person.firstName}}, helaas kan {{organization.name}} uw lidmaatschapsaanvraag niet goedkeuren. "
              + "{{rejection.reason}} Vragen? Mail ons via {{organization.email}}.");

        return new MessageTemplateDefinition(
                JOIN_REQUEST_REJECTED,
                "Membership request rejected",
                "Sent to the applicant when an admin rejects the membership request.",
                CATEGORY_JOIN_REQUEST,
                placeholders,
                OrganizationMessageTemplate.CHANNEL_EMAIL,
                true,
                subjects,
                emailBodies,
                whatsappBodies);
    }
}

package com.mosque.crm.service;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

/**
 * Resolves the text of an outbound WhatsApp message.
 *
 * Two syntaxes are supported:
 * <ul>
 *   <li><b>Placeholders</b> — {@code {{name}}}, {@code {{first_name}}}, {@code {{org}}}</li>
 *   <li><b>Spintax</b> — {@code {Hi|Hello|Hey there}} picks one alternative at random, so the
 *       exact same string is never sent twice in a row. Groups can be nested one level.</li>
 * </ul>
 *
 * Example: {@code "{Hi|Hello} {{name}}, {reminder|quick note} about Friday."}
 */
@Service
public class SpintaxResolver {

    /** Innermost group of alternatives, e.g. "{Hi|Hello}". */
    private static final Pattern SPINTAX_GROUP = Pattern.compile("\\{([^{}]*\\|[^{}]*)\\}");
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([a-zA-Z_]+)\\s*}}");
    private static final int MAX_EXPANSIONS = 25;
    private static final int MAX_LENGTH = 4000;

    private final SecureRandom random = new SecureRandom();

    /**
     * @param template      raw template with placeholders and/or spintax
     * @param placeholders  values for the placeholders (keys without braces, lower case)
     */
    public String resolve(String template, Map<String, String> placeholders) {
        if (template == null) {
            return "";
        }
        String text = template.replace("\\n", "\n");

        if (placeholders != null && !placeholders.isEmpty()) {
            text = replacePlaceholders(text, placeholders);
            // An empty placeholder (e.g. {{first_name}} for a bare phone number) must not
            // leave "Hi , thanks…" behind
            text = text
                    .replaceAll("[ \\t]+([,.;:!?])", "$1")
                    .replaceAll("(?m)^\\s*,\\s*", "")
                    .replaceAll("[ \\t]{2,}", " ");
        }

        // Expand innermost groups first so nested groups work
        for (int i = 0; i < MAX_EXPANSIONS; i++) {
            Matcher matcher = SPINTAX_GROUP.matcher(text);
            if (!matcher.find()) {
                break;
            }
            StringBuilder builder = new StringBuilder();
            int last = 0;
            do {
                builder.append(text, last, matcher.start());
                builder.append(pick(matcher.group(1)));
                last = matcher.end();
            } while (matcher.find());
            builder.append(text.substring(last));
            text = builder.toString();
        }

        return text.length() > MAX_LENGTH ? text.substring(0, MAX_LENGTH) : text;
    }

    /** Convenience overload for a single contact. */
    public String resolve(String template, String name, String organizationName) {
        return resolve(template, Map.of(
                "name", name == null ? "" : name,
                "first_name", firstName(name),
                "org", organizationName == null ? "" : organizationName));
    }

    /**
     * True when the template still contains unresolved groups or placeholders, which is a
     * sign of a typo (e.g. "{Hi|Hello" or "{{nam}}"). Used by the compose screen.
     */
    public boolean hasUnresolvedSyntax(String template) {
        if (template == null) {
            return false;
        }
        return SPINTAX_GROUP.matcher(template).find() || PLACEHOLDER.matcher(template).find();
    }

    /** Number of variants the template can produce (for the UI hint). */
    public long countVariants(String template) {
        if (template == null) {
            return 1;
        }
        long variants = 1;
        Matcher matcher = SPINTAX_GROUP.matcher(template);
        while (matcher.find()) {
            variants *= List.of(matcher.group(1).split("\\|", -1)).size();
        }
        return variants;
    }

    private String replacePlaceholders(String text, Map<String, String> placeholders) {
        Matcher matcher = PLACEHOLDER.matcher(text);
        StringBuilder builder = new StringBuilder();
        int last = 0;
        while (matcher.find()) {
            String key = matcher.group(1).toLowerCase();
            String value = placeholders.getOrDefault(key, "");
            builder.append(text, last, matcher.start()).append(value);
            last = matcher.end();
        }
        builder.append(text.substring(last));
        return builder.toString();
    }

    private String pick(String alternatives) {
        String[] options = alternatives.split("\\|", -1);
        return options[random.nextInt(options.length)].trim();
    }

    private String firstName(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        String trimmed = name.trim();
        int space = trimmed.indexOf(' ');
        return space > 0 ? trimmed.substring(0, space) : trimmed;
    }
}

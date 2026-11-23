package com.mosque.crm.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.util.PhoneUtils;

/**
 * Resolves what a person types into the login field to a stored {@code users.username}.
 *
 * Account emails and account phones are aliases for the unchanged stored username.
 * Existing phone-number usernames are also supported. Requiring people to type the exact E.164 form
 * is poor UX, so this resolver also accepts:
 *
 * <ul>
 *   <li>{@code 31612345678} — digits only, without the plus sign</li>
 *   <li>{@code +31 6 1234 5678} / {@code +31-6-1234-5678} — separators</li>
 *   <li>{@code 0031612345678} — international access prefix instead of {@code +}</li>
 *   <li>{@code 0612345678} — national format, matched on the national significant number</li>
 * </ul>
 *
 * The national-format match is only used when exactly one user matches, so it can never
 * silently log someone in to the wrong account.
 */
@Service
public class LoginIdentifierResolver {

    private static final Logger log = LoggerFactory.getLogger(LoginIdentifierResolver.class);

    /** Digits, plus sign and the usual human separators — anything else is not a phone number. */
    private static final Pattern PHONE_LIKE = Pattern.compile("^[0-9+()\\-./ ]+$");

    private static final int MIN_NATIONAL_NUMBER_LENGTH = 6;

    private final UserRepository userRepository;

    public LoginIdentifierResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Look up the user behind a login identifier (email, username or phone number in any
     * common notation).
     */
    public Optional<User> resolve(String identifier) {
        if (identifier == null) {
            return Optional.empty();
        }
        String trimmed = identifier.trim();
        if (trimmed.isEmpty()) {
            return Optional.empty();
        }

        Optional<User> exact = userRepository.findByUsername(trimmed);
        if (exact.isPresent()) {
            return exact;
        }

        // Usernames derived from emails are stored in lower case
        Optional<User> lowerCase = userRepository.findByUsername(trimmed.toLowerCase(Locale.ROOT));
        if (lowerCase.isPresent()) {
            return lowerCase;
        }

        if (trimmed.contains("@")) {
            return unique(userRepository.findUsersByEmail(trimmed), "email");
        }
        return resolvePhone(trimmed);
    }

    private Optional<User> resolvePhone(String identifier) {
        if (!PHONE_LIKE.matcher(identifier).matches()) {
            return Optional.empty();
        }

        String cleaned = identifier.replaceAll("[^0-9+]", "");
        if (cleaned.isEmpty() || cleaned.equals("+")) {
            return Optional.empty();
        }

        // Canonical E.164 lookup (+31 6 1234 5678, 31612345678, 0031612345678)
        String e164 = toE164(cleaned);
        if (e164 != null) {
            Optional<User> byE164 = userRepository.findByUsername(e164);
            if (byE164.isPresent()) {
                return byE164;
            }
            List<User> byPhone = userRepository.findAllByPhone(e164);
            if (!byPhone.isEmpty()) {
                return unique(byPhone, "phone");
            }
        }

        // National format (e.g. 0612345678): match the national significant number
        String nationalNumber = (cleaned.startsWith("+") ? cleaned.substring(1) : cleaned)
                .replaceFirst("^0+", "");
        if (nationalNumber.length() < MIN_NATIONAL_NUMBER_LENGTH) {
            return Optional.empty();
        }

        List<User> candidates = userRepository.findPhoneUsersByNationalNumber(nationalNumber);
        return unique(candidates, "national phone");
    }

    private String toE164(String cleaned) {
        return PhoneUtils.toE164(cleaned, null);
    }

    private Optional<User> unique(List<User> candidates, String kind) {
        if (candidates.size() == 1) {
            return Optional.of(candidates.get(0));
        }
        if (candidates.size() > 1) {
            log.warn("Ambiguous {} login: {} accounts match", kind, candidates.size());
        }
        return Optional.empty();
    }
}

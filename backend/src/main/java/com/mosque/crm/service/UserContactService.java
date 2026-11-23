package com.mosque.crm.service;

import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.entity.User;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.util.PhoneUtils;

@Service
public class UserContactService {
    private static final Logger log = LoggerFactory.getLogger(UserContactService.class);

    private final UserRepository users;
    private final AuthorizationService authorization;

    public UserContactService(UserRepository users, AuthorizationService authorization) {
        this.users = users;
        this.authorization = authorization;
    }

    @Transactional
    public void updateContacts(User user, String email, String phone) {
        String normalizedEmail = email == null || email.isBlank() ? null : email.trim().toLowerCase(Locale.ROOT);
        String normalizedPhone = normalizePhone(phone);
        requireAvailable(normalizedEmail, user.getId());
        requireAvailable(normalizedPhone, user.getId());
        user.setEmail(normalizedEmail);
        user.setPhone(normalizedPhone);
        users.saveAndFlush(user);
    }

    public void setEmail(User user, String email) {
        String normalized = email == null || email.isBlank() ? null : email.trim().toLowerCase(Locale.ROOT);
        requireAvailable(normalized, user.getId());
        user.setEmail(normalized);
    }

    public void setPhone(User user, String phone) {
        String normalized = normalizePhone(phone);
        requireAvailable(normalized, user.getId());
        user.setPhone(normalized);
    }

    public void validateUsername(String username, Long userId) {
        requireAvailable(username.trim(), userId);
        String phone = PhoneUtils.toE164(username, null);
        if (phone != null) {
            requireAvailable(phone, userId);
        }
    }

    public void copyMemberPhone(User user, String rawPhone) {
        if (user.getId() != null || user.getPhone() != null || rawPhone == null || rawPhone.isBlank()) {
            return;
        }
        String phone = internationalPhone(rawPhone);
        if (phone == null || inUse(phone, user.getId())) {
            log.warn("Account phone not copied for user id={}: invalid international number or contact conflict",
                    user.getId());
            return;
        }
        user.setPhone(phone);
    }

    public void initializeMemberContacts(User user, String email, String phone) {
        if (user.getId() == null) {
            validateUsername(user.getUsername(), null);
        }
        setEmail(user, email);
        copyMemberPhone(user, phone);
    }

    private void requireAvailable(String contact, Long userId) {
        if (contact != null && inUse(contact, userId)) {
            throw new IllegalArgumentException("Email, phone or username already belongs to another account");
        }
    }

    private boolean inUse(String contact, Long userId) {
        return authorization.withoutOrganizationFilter(() ->
                users.existsByLoginContactExcludingUser(contact, userId));
    }

    private String normalizePhone(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String phone = internationalPhone(raw);
        if (phone == null) {
            throw new IllegalArgumentException("Enter a valid phone number including its country code");
        }
        return phone;
    }

    private String internationalPhone(String raw) {
        return raw != null && (raw.trim().startsWith("+") || raw.trim().startsWith("00"))
                ? PhoneUtils.toE164(raw, null) : null;
    }
}

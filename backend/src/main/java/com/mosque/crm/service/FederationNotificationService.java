package com.mosque.crm.service;

import java.util.List;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.mosque.crm.entity.Organization;
import com.mosque.crm.entity.OrganizationPartnership;
import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserNotification;
import com.mosque.crm.repository.OrganizationRepository;
import com.mosque.crm.repository.UserRepository;

@Service
public class FederationNotificationService {

    private static final Logger log = LoggerFactory.getLogger(FederationNotificationService.class);

    private final EmailService emailService;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final ConfigurationService configurationService;
    private final UserNotificationService userNotificationService;
    private final AuthorizationService authorizationService;
    private final MessageLanguageService messageLanguageService;

    public FederationNotificationService(
            EmailService emailService,
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            ConfigurationService configurationService,
            UserNotificationService userNotificationService,
            AuthorizationService authorizationService,
            MessageLanguageService messageLanguageService) {
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.configurationService = configurationService;
        this.userNotificationService = userNotificationService;
        this.authorizationService = authorizationService;
        this.messageLanguageService = messageLanguageService;
    }

    public void notifyPartnershipInvite(OrganizationPartnership partnership) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        String appName = configurationService.getAppName();
        String url = buildOrgUrl(memberOrg.getHandle(), "/partnerships");
        notifyOrgAdmins(
                memberOrg.getId(),
                UserNotification.Types.PARTNERSHIP_INVITE,
                url,
                "/partnerships",
                locale -> new NotificationText(
                        appName + text(locale, " - Partnership invitation from ", " - Uitnodiging voor partnerschap van ") + parentOrg.getName(),
                        text(locale, "Partnership invitation", "Uitnodiging voor partnerschap"),
                        String.format(text(locale, "Your organization %s has been invited to join %s as a member organization.",
                                "Uw organisatie %s is uitgenodigd om als lidorganisatie deel te nemen aan %s."),
                                memberOrg.getName(), parentOrg.getName()),
                        formatMessage(partnership.getMessage(), locale),
                        text(locale, "Review invitation", "Uitnodiging bekijken")));
    }

    public void notifyPartnershipRequest(OrganizationPartnership partnership) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        String appName = configurationService.getAppName();
        String url = buildOrgUrl(parentOrg.getHandle(), "/partnerships");
        notifyOrgAdmins(
                parentOrg.getId(),
                UserNotification.Types.PARTNERSHIP_REQUEST,
                url,
                "/partnerships",
                locale -> new NotificationText(
                        appName + text(locale, " - Partnership request from ", " - Partnerschapsverzoek van ") + memberOrg.getName(),
                        text(locale, "Partnership join request", "Verzoek om partnerschap"),
                        String.format(text(locale, "Organization %s has requested to join your federation %s.",
                                "Organisatie %s heeft gevraagd om lid te worden van uw federatie %s."),
                                memberOrg.getName(), parentOrg.getName()),
                        formatMessage(partnership.getMessage(), locale),
                        text(locale, "Review request", "Verzoek bekijken")));
    }

    public void notifyPartnershipActivated(OrganizationPartnership partnership) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        String appName = configurationService.getAppName();
        String memberUrl = buildOrgUrl(memberOrg.getHandle(), "/partnerships");
        String parentUrl = buildOrgUrl(parentOrg.getHandle(), "/partnerships");
        notifyOrgAdmins(
                memberOrg.getId(),
                UserNotification.Types.PARTNERSHIP_ACTIVE,
                memberUrl,
                "/partnerships",
                locale -> new NotificationText(
                        appName + text(locale, " - Partnership active with ", " - Partnerschap actief met ") + parentOrg.getName(),
                        text(locale, "Partnership active", "Partnerschap actief"),
                        String.format(text(locale, "Your organization %s is now partnered with %s.",
                                "Uw organisatie %s is nu partner van %s."), memberOrg.getName(), parentOrg.getName()),
                        null, text(locale, "Manage sharing", "Delen beheren")));

        notifyOrgAdmins(
                parentOrg.getId(),
                UserNotification.Types.PARTNERSHIP_ACTIVE,
                parentUrl,
                "/partnerships",
                locale -> new NotificationText(
                        appName + text(locale, " - Partnership active with ", " - Partnerschap actief met ") + memberOrg.getName(),
                        text(locale, "New federation member", "Nieuw federatielid"),
                        String.format(text(locale, "Organization %s has joined your federation.",
                                "Organisatie %s is lid geworden van uw federatie."), memberOrg.getName()),
                        null, text(locale, "View partnerships", "Partnerschappen bekijken")));
    }

    public void notifyPartnershipRejected(OrganizationPartnership partnership, String reason) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        String appName = configurationService.getAppName();
        String status = partnership.getStatus();
        Long notifyOrgId = OrganizationPartnership.Status.PENDING_INVITE.name().equals(status)
                ? partnership.getParentOrganizationId()
                : partnership.getMemberOrganizationId();
        notifyOrgAdmins(
                notifyOrgId,
                UserNotification.Types.PARTNERSHIP_REJECTED,
                null,
                "/partnerships",
                locale -> new NotificationText(
                        appName + text(locale, " - Partnership declined", " - Partnerschap afgewezen"),
                        text(locale, "Partnership declined", "Partnerschap afgewezen"),
                        String.format(text(locale, "The partnership between %s and %s was declined.",
                                "Het partnerschap tussen %s en %s is afgewezen."), memberOrg.getName(), parentOrg.getName()),
                        formatReason(reason, locale), null));
    }

    /**
     * Notify the other party's admins that the partnership was suspended.
     *
     * @param actorOrgId organization that performed the suspend
     */
    public void notifyPartnershipSuspended(OrganizationPartnership partnership, Long actorOrgId, String reason) {
        notifyOtherPartyLifecycle(
                partnership,
                actorOrgId,
                UserNotification.Types.PARTNERSHIP_SUSPENDED,
                "Partnership suspended",
                "Partnerschap opgeschort",
                "The partnership between %s and %s has been suspended.",
                "Het partnerschap tussen %s en %s is opgeschort.",
                reason,
                "View partnerships");
    }

    /**
     * Notify the other party's admins that the partnership was reactivated.
     *
     * @param actorOrgId organization that performed the reactivate
     */
    public void notifyPartnershipReactivated(OrganizationPartnership partnership, Long actorOrgId) {
        notifyOtherPartyLifecycle(
                partnership,
                actorOrgId,
                UserNotification.Types.PARTNERSHIP_REACTIVATED,
                "Partnership reactivated",
                "Partnerschap opnieuw geactiveerd",
                "The partnership between %s and %s has been reactivated.",
                "Het partnerschap tussen %s en %s is opnieuw geactiveerd.",
                null,
                "View partnerships");
    }

    /**
     * Notify the other party's admins that the partnership was ended.
     *
     * @param actorOrgId organization that performed the end
     */
    public void notifyPartnershipEnded(OrganizationPartnership partnership, Long actorOrgId, String reason) {
        notifyOtherPartyLifecycle(
                partnership,
                actorOrgId,
                UserNotification.Types.PARTNERSHIP_ENDED,
                "Partnership ended",
                "Partnerschap beëindigd",
                "The partnership between %s and %s has ended.",
                "Het partnerschap tussen %s en %s is beëindigd.",
                reason,
                "View partnerships");
    }

    private void notifyOtherPartyLifecycle(
            OrganizationPartnership partnership,
            Long actorOrgId,
            String notificationType,
            String titleEn,
            String titleNl,
            String bodyTemplate,
            String bodyTemplateNl,
            String reason,
            String actionLabel) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        Long notifyOrgId = actorOrgId != null && actorOrgId.equals(partnership.getParentOrganizationId())
                ? partnership.getMemberOrganizationId()
                : partnership.getParentOrganizationId();
        Organization notifyOrg = notifyOrgId.equals(memberOrg.getId()) ? memberOrg : parentOrg;
        String appName = configurationService.getAppName();
        String url = buildOrgUrl(notifyOrg.getHandle(), "/partnerships");

        notifyOrgAdmins(
                notifyOrgId,
                notificationType,
                url,
                "/partnerships",
                locale -> new NotificationText(
                        appName + " - " + text(locale, titleEn, titleNl),
                        text(locale, titleEn, titleNl),
                        String.format(text(locale, bodyTemplate, bodyTemplateNl), memberOrg.getName(), parentOrg.getName()),
                        reason != null && !reason.isBlank() ? formatReason(reason, locale) : null,
                        text(locale, actionLabel, "Partnerschappen bekijken")));
    }

    public void notifyBusinessSubmittedForApproval(Long orgId, String businessName) {
        Organization org = getOrg(orgId);
        String adminUrl = buildOrgUrl(org.getHandle(), "/business-directory/admin");
        String appName = configurationService.getAppName();
        notifyOrgAdmins(
                orgId,
                UserNotification.Types.BUSINESS_PENDING,
                adminUrl,
                "/business-directory/admin",
                locale -> new NotificationText(
                        appName + text(locale, " - Business listing pending approval", " - Bedrijfsvermelding wacht op goedkeuring"),
                        text(locale, "Business listing pending approval", "Bedrijfsvermelding wacht op goedkeuring"),
                        String.format(text(locale, "Business \"%s\" was submitted for approval in %s.",
                                "Bedrijf \"%s\" is ter goedkeuring ingediend bij %s."), businessName, org.getName()),
                        null, text(locale, "Review listing", "Vermelding bekijken")));
    }

    public void notifyBusinessApproved(Long userId, Long organizationId, String memberEmail, String memberName,
            String businessName, String orgName) {
        notifyBusinessOwnerDecision(
                userId,
                organizationId,
                memberEmail,
                memberName,
                businessName,
                orgName,
                true,
                null);
    }

    public void notifyBusinessRejected(Long userId, Long organizationId, String memberEmail, String memberName,
            String businessName, String orgName, String reason) {
        notifyBusinessOwnerDecision(
                userId,
                organizationId,
                memberEmail,
                memberName,
                businessName,
                orgName,
                false,
                reason);
    }

    public void notifyBusinessSuspended(Long userId, Long organizationId, String memberEmail, String memberName,
            String businessName, String orgName, String reason) {
        String appName = configurationService.getAppName();
        Long targetUserId = findRecipient(userId, organizationId, memberEmail);
        String locale = messageLanguageService.resolve(targetUserId, organizationId);
        String title = text(locale, "Business listing suspended", "Bedrijfsvermelding opgeschort");
        String body = String.format(text(locale,
                "Your business \"%s\" was suspended in %s and is no longer visible in the directory.",
                "Uw bedrijf \"%s\" is opgeschort in %s en is niet langer zichtbaar in de bedrijvengids."),
                businessName, orgName);
        String detail = formatReason(reason, locale);
        String inAppBody = body + " " + detail;

        if (memberEmail != null && !memberEmail.isBlank()) {
            try {
                emailService.sendFederationMemberNotificationEmail(
                        memberEmail,
                        appName + " - " + title,
                        title,
                        memberName,
                        body,
                        detail,
                        locale);
            } catch (Exception e) {
                log.warn("Failed to email business owner {}: {}", memberEmail, e.getMessage());
            }
        }

        if (targetUserId != null) {
            userNotificationService.create(
                    targetUserId,
                    organizationId,
                    UserNotification.Types.BUSINESS_SUSPENDED,
                    title,
                    inAppBody,
                    "/my-businesses");
        }
    }

    private void notifyBusinessOwnerDecision(
            Long userId,
            Long organizationId,
            String memberEmail,
            String memberName,
            String businessName,
            String orgName,
            boolean approved,
            String reason) {
        String appName = configurationService.getAppName();
        Long targetUserId = findRecipient(userId, organizationId, memberEmail);
        String locale = messageLanguageService.resolve(targetUserId, organizationId);
        String title = approved
                ? text(locale, "Business listing approved", "Bedrijfsvermelding goedgekeurd")
                : text(locale, "Business listing needs changes", "Bedrijfsvermelding moet worden aangepast");
        String body = approved
                ? String.format(text(locale, "Your business \"%s\" has been approved and published in %s.",
                        "Uw bedrijf \"%s\" is goedgekeurd en gepubliceerd in %s."), businessName, orgName)
                : String.format(text(locale, "Your business \"%s\" was not approved in %s.",
                        "Uw bedrijf \"%s\" is niet goedgekeurd in %s."), businessName, orgName);
        String inAppBody = approved
                ? body
                : body + (reason != null && !reason.isBlank() ? " " + formatReason(reason, locale) : "");

        if (memberEmail != null && !memberEmail.isBlank()) {
            try {
                if (approved) {
                    emailService.sendFederationMemberNotificationEmail(
                            memberEmail,
                            appName + " - " + title,
                            title,
                            memberName,
                            body,
                            null,
                            locale);
                } else {
                    emailService.sendFederationMemberNotificationEmail(
                            memberEmail,
                            appName + " - " + title,
                            title,
                            memberName,
                            body,
                            formatReason(reason, locale),
                            locale);
                }
            } catch (Exception e) {
                log.warn("Failed to email business owner {}: {}", memberEmail, e.getMessage());
            }
        }

        if (targetUserId != null) {
            userNotificationService.create(
                    targetUserId,
                    organizationId,
                    approved ? UserNotification.Types.BUSINESS_APPROVED : UserNotification.Types.BUSINESS_REJECTED,
                    title,
                    inAppBody,
                    "/my-businesses");
        }
    }

    private Long findRecipient(Long userId, Long organizationId, String email) {
        if (userId != null || email == null || email.isBlank()) {
            return userId;
        }
        return authorizationService.withoutOrganizationFilter(
                () -> userRepository.findByEmailIgnoreCaseAndOrganizationId(email, organizationId)
                        .map(User::getId).orElse(null));
    }

    private record NotificationText(String subject, String title, String body,
                                    String detail, String actionLabel) { }

    /**
     * Notify org admins by bell + email. Always disables the tenant filter so
     * cross-organization partnership alerts can resolve admins in the other org.
     */
    private void notifyOrgAdmins(
            Long orgId,
            String notificationType,
            String actionUrl,
            String linkPath,
            Function<String, NotificationText> textForLocale) {
        authorizationService.withoutOrganizationFilter(() -> {
            List<User> admins = userRepository.findAdminUsers(orgId);
            if (admins.isEmpty()) {
                log.warn("No admin recipients for organization {}", orgId);
                return null;
            }
            for (User admin : admins) {
                String locale = messageLanguageService.resolve(admin.getId(), orgId);
                NotificationText content = textForLocale.apply(locale);
                String inAppBody = content.detail() != null && !content.detail().isBlank()
                        ? content.body() + " " + content.detail()
                        : content.body();
                try {
                    userNotificationService.create(
                            admin.getId(),
                            orgId,
                            notificationType,
                            content.title(),
                            inAppBody,
                            linkPath);
                } catch (Exception e) {
                    log.warn("Failed to create in-app notification for admin {}: {}", admin.getId(), e.getMessage());
                }
                if (admin.getEmail() == null || admin.getEmail().isBlank()) {
                    continue;
                }
                try {
                    emailService.sendFederationAdminNotificationEmail(
                            admin.getEmail(), content.subject(), content.title(), content.body(), content.detail(),
                            actionUrl, content.actionLabel(), locale);
                } catch (Exception e) {
                    log.warn("Failed to notify admin {}: {}", admin.getEmail(), e.getMessage());
                }
            }
            return null;
        });
    }

    private String formatMessage(String message, String locale) {
        if (message == null || message.isBlank()) {
            return "nl".equalsIgnoreCase(locale) ? "Geen bericht." : "No message.";
        }
        return ("nl".equalsIgnoreCase(locale) ? "Bericht: " : "Message: ") + message;
    }

    private String formatReason(String reason, String locale) {
        if (reason == null || reason.isBlank()) {
            return "nl".equalsIgnoreCase(locale) ? "Geen reden opgegeven." : "No reason provided.";
        }
        return ("nl".equalsIgnoreCase(locale) ? "Reden: " : "Reason: ") + reason;
    }

    private String text(String locale, String english, String dutch) {
        return "nl".equals(locale) ? dutch : english;
    }

    private Organization getOrg(Long orgId) {
        return organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalStateException("Organization not found: " + orgId));
    }

    private String buildOrgUrl(String orgHandle, String path) {
        String protocol = configurationService.getFrontendProtocol();
        String baseDomain = configurationService.getFrontendBaseDomain();
        return protocol + "://" + orgHandle + "." + baseDomain + path;
    }
}

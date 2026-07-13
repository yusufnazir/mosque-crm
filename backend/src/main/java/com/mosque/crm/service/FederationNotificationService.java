package com.mosque.crm.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.i18n.LocaleContextHolder;
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

    public FederationNotificationService(
            EmailService emailService,
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            ConfigurationService configurationService,
            UserNotificationService userNotificationService,
            AuthorizationService authorizationService) {
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.configurationService = configurationService;
        this.userNotificationService = userNotificationService;
        this.authorizationService = authorizationService;
    }

    public void notifyPartnershipInvite(OrganizationPartnership partnership) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        String appName = configurationService.getAppName();
        String url = buildOrgUrl(memberOrg.getHandle(), "/partnerships");
        String locale = currentLocale();
        String title = "Partnership invitation";
        String body = String.format("Your organization %s has been invited to join %s as a member organization.",
                memberOrg.getName(), parentOrg.getName());
        notifyOrgAdmins(
                memberOrg.getId(),
                UserNotification.Types.PARTNERSHIP_INVITE,
                appName + " - Partnership invitation from " + parentOrg.getName(),
                title,
                body,
                formatMessage(partnership.getMessage(), locale),
                url,
                "/partnerships",
                "Review invitation",
                locale);
    }

    public void notifyPartnershipRequest(OrganizationPartnership partnership) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        String appName = configurationService.getAppName();
        String url = buildOrgUrl(parentOrg.getHandle(), "/partnerships");
        String locale = currentLocale();
        String title = "Partnership join request";
        String body = String.format("Organization %s has requested to join your federation %s.",
                memberOrg.getName(), parentOrg.getName());
        notifyOrgAdmins(
                parentOrg.getId(),
                UserNotification.Types.PARTNERSHIP_REQUEST,
                appName + " - Partnership request from " + memberOrg.getName(),
                title,
                body,
                formatMessage(partnership.getMessage(), locale),
                url,
                "/partnerships",
                "Review request",
                locale);
    }

    public void notifyPartnershipActivated(OrganizationPartnership partnership) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        String appName = configurationService.getAppName();
        String memberUrl = buildOrgUrl(memberOrg.getHandle(), "/partnerships");
        String parentUrl = buildOrgUrl(parentOrg.getHandle(), "/partnerships");
        String locale = currentLocale();

        notifyOrgAdmins(
                memberOrg.getId(),
                UserNotification.Types.PARTNERSHIP_ACTIVE,
                appName + " - Partnership active with " + parentOrg.getName(),
                "Partnership active",
                String.format("Your organization %s is now partnered with %s.", memberOrg.getName(), parentOrg.getName()),
                null,
                memberUrl,
                "/partnerships",
                "Manage sharing",
                locale);

        notifyOrgAdmins(
                parentOrg.getId(),
                UserNotification.Types.PARTNERSHIP_ACTIVE,
                appName + " - Partnership active with " + memberOrg.getName(),
                "New federation member",
                String.format("Organization %s has joined your federation.", memberOrg.getName()),
                null,
                parentUrl,
                "/partnerships",
                "View partnerships",
                locale);
    }

    public void notifyPartnershipRejected(OrganizationPartnership partnership, String reason) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        String appName = configurationService.getAppName();
        String status = partnership.getStatus();
        Long notifyOrgId = OrganizationPartnership.Status.PENDING_INVITE.name().equals(status)
                ? partnership.getParentOrganizationId()
                : partnership.getMemberOrganizationId();
        String locale = currentLocale();

        notifyOrgAdmins(
                notifyOrgId,
                UserNotification.Types.PARTNERSHIP_REJECTED,
                appName + " - Partnership declined",
                "Partnership declined",
                String.format("The partnership between %s and %s was declined.", memberOrg.getName(), parentOrg.getName()),
                formatReason(reason, locale),
                null,
                "/partnerships",
                null,
                locale);
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
                "Partnership suspended",
                "The partnership between %s and %s has been suspended.",
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
                "Partnership reactivated",
                "The partnership between %s and %s has been reactivated.",
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
                "Partnership ended",
                "The partnership between %s and %s has ended.",
                reason,
                "View partnerships");
    }

    private void notifyOtherPartyLifecycle(
            OrganizationPartnership partnership,
            Long actorOrgId,
            String notificationType,
            String subjectSuffix,
            String title,
            String bodyTemplate,
            String reason,
            String actionLabel) {
        Organization memberOrg = getOrg(partnership.getMemberOrganizationId());
        Organization parentOrg = getOrg(partnership.getParentOrganizationId());
        Long notifyOrgId = actorOrgId != null && actorOrgId.equals(partnership.getParentOrganizationId())
                ? partnership.getMemberOrganizationId()
                : partnership.getParentOrganizationId();
        Organization notifyOrg = notifyOrgId.equals(memberOrg.getId()) ? memberOrg : parentOrg;
        String appName = configurationService.getAppName();
        String locale = currentLocale();
        String url = buildOrgUrl(notifyOrg.getHandle(), "/partnerships");
        String detail = reason != null && !reason.isBlank() ? formatReason(reason, locale) : null;

        notifyOrgAdmins(
                notifyOrgId,
                notificationType,
                appName + " - " + subjectSuffix,
                title,
                String.format(bodyTemplate, memberOrg.getName(), parentOrg.getName()),
                detail,
                url,
                "/partnerships",
                actionLabel,
                locale);
    }

    public void notifyBusinessSubmittedForApproval(Long orgId, String businessName) {
        Organization org = getOrg(orgId);
        String adminUrl = buildOrgUrl(org.getHandle(), "/business-directory/admin");
        String appName = configurationService.getAppName();
        String locale = currentLocale();
        notifyOrgAdmins(
                orgId,
                UserNotification.Types.BUSINESS_PENDING,
                appName + " - Business listing pending approval",
                "Business listing pending approval",
                String.format("Business \"%s\" was submitted for approval in %s.", businessName, org.getName()),
                null,
                adminUrl,
                "/business-directory/admin",
                "Review listing",
                locale);
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
        String locale = currentLocale();
        String title = "Business listing suspended";
        String body = String.format(
                "Your business \"%s\" was suspended in %s and is no longer visible in the directory.",
                businessName, orgName);
        String detail = formatReason(reason, locale);
        String inAppBody = body + " " + detail;

        if (memberEmail != null && !memberEmail.isBlank()) {
            try {
                emailService.sendFederationMemberNotificationEmail(
                        memberEmail,
                        appName + " - Business listing suspended",
                        title,
                        memberName,
                        body,
                        detail,
                        locale);
            } catch (Exception e) {
                log.warn("Failed to email business owner {}: {}", memberEmail, e.getMessage());
            }
        }

        Long targetUserId = userId;
        if (targetUserId == null && memberEmail != null && !memberEmail.isBlank()) {
            targetUserId = authorizationService.withoutOrganizationFilter(
                    () -> userRepository.findByEmail(memberEmail).map(User::getId).orElse(null));
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
        String locale = currentLocale();
        String title = approved ? "Business listing approved" : "Business listing needs changes";
        String body = approved
                ? String.format("Your business \"%s\" has been approved and published in %s.", businessName, orgName)
                : String.format("Your business \"%s\" was not approved in %s.", businessName, orgName);
        String inAppBody = approved
                ? body
                : body + (reason != null && !reason.isBlank() ? " " + formatReason(reason, locale) : "");

        if (memberEmail != null && !memberEmail.isBlank()) {
            try {
                if (approved) {
                    emailService.sendFederationMemberNotificationEmail(
                            memberEmail,
                            appName + " - Business listing approved",
                            title,
                            memberName,
                            body,
                            null,
                            locale);
                } else {
                    emailService.sendFederationMemberNotificationEmail(
                            memberEmail,
                            appName + " - Business listing needs changes",
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

        Long targetUserId = userId;
        if (targetUserId == null && memberEmail != null && !memberEmail.isBlank()) {
            // Cross-org email lookup must ignore tenant filter.
            targetUserId = authorizationService.withoutOrganizationFilter(
                    () -> userRepository.findByEmail(memberEmail).map(User::getId).orElse(null));
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

    /**
     * Notify org admins by bell + email. Always disables the tenant filter so
     * cross-organization partnership alerts can resolve admins in the other org.
     */
    private void notifyOrgAdmins(
            Long orgId,
            String notificationType,
            String subject,
            String title,
            String bodyText,
            String detailMessage,
            String actionUrl,
            String linkPath,
            String actionLabel,
            String locale) {
        authorizationService.withoutOrganizationFilter(() -> {
            List<User> admins = userRepository.findAdminUsers(orgId);
            if (admins.isEmpty()) {
                log.warn("No admin recipients for organization {}", orgId);
                return null;
            }
            String inAppBody = detailMessage != null && !detailMessage.isBlank()
                    ? bodyText + " " + detailMessage
                    : bodyText;
            for (User admin : admins) {
                try {
                    userNotificationService.create(
                            admin.getId(),
                            orgId,
                            notificationType,
                            title,
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
                            admin.getEmail(), subject, title, bodyText, detailMessage, actionUrl, actionLabel, locale);
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

    private String currentLocale() {
        try {
            return LocaleContextHolder.getLocale().getLanguage();
        } catch (Exception e) {
            return "en";
        }
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

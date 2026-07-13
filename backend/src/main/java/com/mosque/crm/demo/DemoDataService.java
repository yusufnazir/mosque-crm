package com.mosque.crm.demo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mosque.crm.federation.FederationConstants;
import com.mosque.crm.service.ConfigurationService;
import com.mosque.crm.service.RoleTemplateService;
import com.mosque.crm.service.TenantSettingService;

@Service
public class DemoDataService {

    private static final Logger log = LoggerFactory.getLogger(DemoDataService.class);
    private static final long PLAN_PRO = 3L;
    private static final int BUSINESSES_PER_ORG = 20;
    private static final int MEMBERS_PER_ORG = 18;

    private static final String[] CITIES = {
            "Paramaribo", "Wanica", "Nickerie", "Commewijne", "Saramacca",
            "Brokopondo", "Marowijne", "Para", "Coronie", "Sipaliwini"
    };
    private static final String[] CATEGORIES = {
            "restaurant", "grocery", "retail", "services", "education",
            "health", "professional", "hospitality", "automotive", "construction"
    };
    private static final String[] FIRST_NAMES = {
            "Mohammed", "Fatima", "Hassan", "Aisha", "Yusuf", "Mariam", "Ibrahim", "Zainab",
            "Omar", "Khadija", "Ali", "Sara", "Ahmed", "Layla", "Karim", "Noor", "Rashid", "Amira"
    };
    private static final String[] LAST_NAMES = {
            "Khan", "Ali", "Rahman", "Hussein", "Abdullah", "Ismail", "Hassan", "Mahmood", "Nasser"
    };
    private static final String[] BUSINESS_PREFIXES = {
            "Toko", "Restaurant", "Bakkerij", "Salon", "Garage", "Apotheek", "Boetiek",
            "Supermarkt", "Café", "Schoenmaker", "Wasstraat", "Boekhandel", "Elektronica",
            "Kleding", "Slagerij", "Groente", "Tandarts", "Notaris", "Reisbureau", "Fitness"
    };

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final RoleTemplateService roleTemplateService;
    private final ConfigurationService configurationService;

    public DemoDataService(
            JdbcTemplate jdbc,
            PasswordEncoder passwordEncoder,
            RoleTemplateService roleTemplateService,
            ConfigurationService configurationService) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.roleTemplateService = roleTemplateService;
        this.configurationService = configurationService;
    }

    public DemoDataStatusDTO getStatus() {
        long orgCount = countOrganizations();
        boolean seeded = orgExists(DemoDataCatalog.PARENT_HANDLE);
        boolean canCreate = orgCount == 0;
        String message;
        if (seeded) {
            message = "Demo data is already present.";
        } else if (!canCreate) {
            message = "Database already has organizations. Demo seed requires an empty tenant database.";
        } else {
            message = "Ready to create RBSIS Paramaribo federation demo data.";
        }
        return new DemoDataStatusDTO(seeded, canCreate, message, DemoDataCatalog.credentials());
    }

    @Transactional
    public DemoDataStatusDTO seed() {
        DemoDataStatusDTO before = getStatus();
        if (!before.canCreate()) {
            throw new IllegalStateException(before.message());
        }

        String passwordHash = passwordEncoder.encode(DemoDataCatalog.SHARED_PASSWORD);
        Long srdId = jdbc.queryForObject("SELECT id FROM currencies WHERE code = 'SRD'", Long.class);
        LocalDateTime now = LocalDateTime.now();

        long parentId = createOrganization(
                "RBSIS Paramaribo", "RBSIS", DemoDataCatalog.PARENT_HANDLE,
                "Paramaribo", "Suriname", "info@" + DemoDataCatalog.PARENT_HANDLE + ".local", now);
        roleTemplateService.provisionDefaultRolesForOrganization(parentId);
        subscribePro(parentId, now);
        configurationService.setTenantValue(
                TenantSettingService.PUBLIC_DIRECTORY_ENABLED_KEY, "true", parentId);

        long baiturId = createMosque("Moskee Baitur Rochim", "Baitur Rochim", "demo-baiturrochim",
                "Wanica", now);
        long darulId = createMosque("Moskee Darul Iman", "Darul Iman", "demo-daruliman",
                "Commewijne", now);
        long annurId = createMosque("Moskee An-Nur", "An-Nur", "demo-annur",
                "Nickerie", now);

        seedOrgUsersAndContent(parentId, DemoDataCatalog.PARENT_PREFIX, "RBSIS", passwordHash, srdId, now, true);
        seedOrgUsersAndContent(baiturId, "baitur", "Baitur", passwordHash, srdId, now, false);
        seedOrgUsersAndContent(darulId, "darul", "Darul", passwordHash, srdId, now, false);
        seedOrgUsersAndContent(annurId, "annur", "AnNur", passwordHash, srdId, now, false);

        createActivePartnership(parentId, baiturId, now);
        createActivePartnership(parentId, darulId, now);
        createActivePartnership(parentId, annurId, now);

        log.info("Demo federation seeded: parent={} members={},{},{}", parentId, baiturId, darulId, annurId);
        return getStatus();
    }

    private long createMosque(String name, String shortName, String handle, String city, LocalDateTime now) {
        long orgId = createOrganization(name, shortName, handle, city, "Suriname",
                "info@" + handle + ".local", now);
        roleTemplateService.provisionDefaultRolesForOrganization(orgId);
        subscribePro(orgId, now);
        return orgId;
    }

    private void seedOrgUsersAndContent(
            long orgId,
            String prefix,
            String label,
            String passwordHash,
            Long srdId,
            LocalDateTime now,
            boolean parentOnlyAdmin) {

        long adminRoleId = requireRoleId(orgId, "ADMIN");
        long memberRoleId = requireRoleId(orgId, "MEMBER");

        long adminUserId = createUser("demo_" + prefix + "_admin",
                "demo-" + prefix + "-admin@demo.local", passwordHash, orgId, adminRoleId, now);

        Long portalPersonId = null;
        if (!parentOnlyAdmin) {
            createUser("demo_" + prefix + "_treasurer",
                    "demo-" + prefix + "-treasurer@demo.local", passwordHash, orgId, adminRoleId, now);
            long memberUserId = createUser("demo_" + prefix + "_member",
                    "demo-" + prefix + "-member@demo.local", passwordHash, orgId, memberRoleId, now);
            portalPersonId = createPerson("Ahmed", label, "demo-" + prefix + "-portal@demo.local",
                    orgId, CITIES[0], now);
            createMembership(portalPersonId, orgId, now);
            linkUserToPerson(memberUserId, portalPersonId, orgId);
        }

        List<Long> personIds = new ArrayList<>();
        for (int i = 0; i < MEMBERS_PER_ORG; i++) {
            String first = FIRST_NAMES[i % FIRST_NAMES.length];
            String last = LAST_NAMES[i % LAST_NAMES.length];
            String email = "demo-" + prefix + "-p" + (i + 1) + "@demo.local";
            String city = CITIES[i % CITIES.length];
            long personId = createPerson(first, last, email, orgId, city, now);
            createMembership(personId, orgId, now);
            personIds.add(personId);
        }

        long group1 = createGroup("Familie " + label, orgId, adminUserId, now);
        long group2 = createGroup("Jeugdgroep " + label, orgId, adminUserId, now);
        for (int i = 0; i < Math.min(6, personIds.size()); i++) {
            addGroupMember(group1, personIds.get(i), orgId, now);
        }
        for (int i = 6; i < Math.min(12, personIds.size()); i++) {
            addGroupMember(group2, personIds.get(i), orgId, now);
        }

        long contributionTypeId = createContributionType(orgId, now);
        for (int i = 0; i < Math.min(8, personIds.size()); i++) {
            createPayment(personIds.get(i), contributionTypeId, orgId, adminUserId, srdId, now, i);
        }

        createGeneralEvent(orgId, "Iftar avond " + label, "IFTAR", now);
        createGeneralEvent(orgId, "Collecte " + label, "FUNDRAISER", now);

        for (int i = 0; i < BUSINESSES_PER_ORG; i++) {
            // First three listings belong to the portal member so My Businesses has demo data.
            Long ownerId;
            if (portalPersonId != null && i < 3) {
                ownerId = portalPersonId;
            } else {
                ownerId = personIds.get(i % personIds.size());
            }
            String status;
            if (i == 0) {
                status = "PUBLISHED";
            } else if (i == 1) {
                status = "PENDING_APPROVAL";
            } else if (i == 2) {
                status = "DRAFT";
            } else if (i < 12) {
                status = "PUBLISHED";
            } else if (i < 16) {
                status = "PENDING_APPROVAL";
            } else {
                status = "DRAFT";
            }
            createBusinessWithListing(
                    orgId,
                    ownerId,
                    BUSINESS_PREFIXES[i % BUSINESS_PREFIXES.length] + " " + label + " " + (i + 1),
                    CATEGORIES[i % CATEGORIES.length],
                    CITIES[i % CITIES.length],
                    status,
                    now);
        }
    }

    private long createOrganization(
            String name,
            String shortName,
            String handle,
            String city,
            String country,
            String email,
            LocalDateTime now) {
        jdbc.update(
                "INSERT INTO organizations (name, short_name, handle, city, country, email, active, created_at, updated_at) "
                        + "VALUES (?,?,?,?,?,?,?,?,?)",
                name, shortName, handle, city, country, email, true, now, now);
        return jdbc.queryForObject("SELECT id FROM organizations WHERE handle = ?", Long.class, handle);
    }

    private void subscribePro(long orgId, LocalDateTime now) {
        jdbc.update(
                "INSERT INTO organization_subscriptions "
                        + "(organization_id, plan_id, billing_cycle, status, starts_at, auto_renew, billing_enabled, created_at, updated_at) "
                        + "VALUES (?,?,?,?,?,?,?,?,?)",
                orgId, PLAN_PRO, "MONTHLY", "ACTIVE", now, true, false, now, now);
    }

    private long requireRoleId(long orgId, String roleName) {
        Long id = jdbc.queryForObject(
                "SELECT id FROM roles WHERE name = ? AND organization_id = ?",
                Long.class, roleName, orgId);
        if (id == null) {
            throw new IllegalStateException("Role " + roleName + " missing for org " + orgId);
        }
        return id;
    }

    private long createUser(
            String username,
            String email,
            String passwordHash,
            long orgId,
            long roleId,
            LocalDateTime now) {
        jdbc.update(
                "INSERT INTO users (username, password, email, account_enabled, account_locked, credentials_expired, "
                        + "must_change_password, organization_id, created_at, updated_at) "
                        + "VALUES (?,?,?,?,?,?,?,?,?,?)",
                username, passwordHash, email, true, false, false, false, orgId, now, now);
        Long userId = jdbc.queryForObject("SELECT id FROM users WHERE username = ?", Long.class, username);
        jdbc.update("INSERT INTO user_roles (user_id, role_id, organization_id) VALUES (?,?,?)",
                userId, roleId, orgId);
        return userId;
    }

    private long createPerson(
            String firstName,
            String lastName,
            String email,
            long orgId,
            String city,
            LocalDateTime now) {
        jdbc.update(
                "INSERT INTO persons (first_name, last_name, email, city, country, status, hash, organization_id, created_at, updated_at) "
                        + "VALUES (?,?,?,?,?,?,?,?,?,?)",
                firstName, lastName, email, city, "Suriname", "ACTIVE", UUID.randomUUID().toString(),
                orgId, now, now);
        return jdbc.queryForObject("SELECT id FROM persons WHERE email = ?", Long.class, email);
    }

    private void createMembership(long personId, long orgId, LocalDateTime now) {
        jdbc.update(
                "INSERT INTO memberships (person_id, membership_type, start_date, status, organization_id, created_at, updated_at) "
                        + "VALUES (?,?,?,?,?,?,?)",
                personId, "FULL", LocalDate.now().minusMonths(6), "ACTIVE", orgId, now, now);
    }

    private void linkUserToPerson(long userId, long personId, long orgId) {
        jdbc.update(
                "INSERT INTO user_member_link (user_id, person_id, organization_id) VALUES (?,?,?)",
                userId, personId, orgId);
    }

    private long createGroup(String name, long orgId, long createdBy, LocalDateTime now) {
        jdbc.update(
                "INSERT INTO groups (name, description, is_active, created_by, organization_id, created_at) "
                        + "VALUES (?,?,?,?,?,?)",
                name, "Demo groep", true, createdBy, orgId, now);
        return jdbc.queryForObject(
                "SELECT id FROM groups WHERE name = ? AND organization_id = ?",
                Long.class, name, orgId);
    }

    private void addGroupMember(long groupId, long personId, long orgId, LocalDateTime now) {
        jdbc.update(
                "INSERT INTO group_members (group_id, person_id, organization_id, created_at) VALUES (?,?,?,?)",
                groupId, personId, orgId, now);
    }

    private long createContributionType(long orgId, LocalDateTime now) {
        jdbc.update(
                "INSERT INTO contribution_types (code, is_required, is_active, organization_id, created_at) "
                        + "VALUES (?,?,?,?,?)",
                "LIDGELD", true, true, orgId, now);
        Long typeId = jdbc.queryForObject(
                "SELECT id FROM contribution_types WHERE code = ? AND organization_id = ?",
                Long.class, "LIDGELD", orgId);
        jdbc.update(
                "INSERT INTO contribution_type_translations (contribution_type_id, locale, name, description) "
                        + "VALUES (?,?,?,?)",
                typeId, "nl", "Lidgeld", "Maandelijks lidgeld");
        jdbc.update(
                "INSERT INTO contribution_type_translations (contribution_type_id, locale, name, description) "
                        + "VALUES (?,?,?,?)",
                typeId, "en", "Membership fee", "Monthly membership fee");
        return typeId;
    }

    private void createPayment(
            long personId,
            long contributionTypeId,
            long orgId,
            long createdBy,
            Long currencyId,
            LocalDateTime now,
            int offset) {
        LocalDate payDate = LocalDate.now().minusMonths(offset % 6);
        jdbc.update(
                "INSERT INTO member_payments (person_id, contribution_type_id, amount, payment_date, period_from, period_to, "
                        + "reference, currency_id, created_by, is_reversal, organization_id, created_at) "
                        + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                personId, contributionTypeId, new BigDecimal("75.00"), payDate,
                payDate.withDayOfMonth(1), payDate.withDayOfMonth(1).plusMonths(1).minusDays(1),
                "DEMO-" + personId + "-" + offset, currencyId, createdBy, false, orgId, now);
    }

    private void createGeneralEvent(long orgId, String name, String type, LocalDateTime now) {
        jdbc.update(
                "INSERT INTO org_general_events (organization_id, name, general_event_type, start_date, status, visibility, "
                        + "ticketing_type, currency, requires_registration, requires_check_in, "
                        + "federation_hidden, created_at, updated_at) "
                        + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                orgId, name, type, LocalDate.now().plusDays(14), "PUBLISHED", "MEMBERS_ONLY",
                "NONE", "SRD", false, false, false, now, now);
    }

    private void createBusinessWithListing(
            long orgId,
            Long ownerPersonId,
            String name,
            String category,
            String city,
            String status,
            LocalDateTime now) {
        String slug = demoSlug(name);
        String phone = "597" + (1000000 + (Math.abs(name.hashCode()) % 9000000));
        DemoOnlinePresence presence = demoOnlinePresence(orgId, name, slug, phone);

        jdbc.update(
                "INSERT INTO businesses (organization_id, owner_person_id, name, category, description, email, phone, "
                        + "website, facebook_url, instagram_url, tiktok_url, youtube_url, linkedin_url, whatsapp_url, "
                        + "city, country, created_at, updated_at) "
                        + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                orgId, ownerPersonId, name, category,
                "Demo bedrijf in " + city + ", Suriname.",
                "demo-biz-" + orgId + "-" + Math.abs(name.hashCode() % 100000) + "@demo.local",
                phone,
                presence.website(),
                presence.facebookUrl(),
                presence.instagramUrl(),
                presence.tiktokUrl(),
                presence.youtubeUrl(),
                presence.linkedinUrl(),
                presence.whatsappUrl(),
                city, "Suriname", now, now);
        Long businessId = jdbc.queryForObject(
                "SELECT id FROM businesses WHERE organization_id = ? AND name = ?",
                Long.class, orgId, name);

        boolean published = "PUBLISHED".equals(status);
        String visibility = published ? "SHARED_WITH_FEDERATION" : "LOCAL_ONLY";
        jdbc.update(
                "INSERT INTO business_listings (organization_id, business_id, status, visibility, public_visible, "
                        + "published_at, submitted_at, federation_hidden, created_at, updated_at) "
                        + "VALUES (?,?,?,?,?,?,?,?,?,?)",
                orgId, businessId, status, visibility, published,
                published ? now : null,
                !"DRAFT".equals(status) ? now : null,
                false, now, now);
    }

    /** Deterministic fake website / social mix so re-seeds look varied but stable. */
    private static DemoOnlinePresence demoOnlinePresence(long orgId, String name, String slug, String phone) {
        Random rnd = new Random(((long) name.hashCode() * 31L) ^ orgId);
        String website = rnd.nextInt(100) < 65 ? "https://www." + slug + ".demo" : null;

        String facebook = null;
        String instagram = null;
        String tiktok = null;
        String youtube = null;
        String linkedin = null;
        String whatsapp = null;

        // 0–4 social channels, shuffled selection
        String[] channels = {"facebook", "instagram", "tiktok", "youtube", "linkedin", "whatsapp"};
        for (int i = channels.length - 1; i > 0; i--) {
            int j = rnd.nextInt(i + 1);
            String tmp = channels[i];
            channels[i] = channels[j];
            channels[j] = tmp;
        }
        int socialCount = rnd.nextInt(5); // 0..4
        for (int i = 0; i < socialCount; i++) {
            switch (channels[i]) {
                case "facebook" -> facebook = "https://facebook.com/" + slug;
                case "instagram" -> instagram = "https://instagram.com/" + slug;
                case "tiktok" -> tiktok = "https://tiktok.com/@" + slug;
                case "youtube" -> youtube = "https://youtube.com/@" + slug;
                case "linkedin" -> linkedin = "https://linkedin.com/company/" + slug;
                case "whatsapp" -> whatsapp = "https://wa.me/" + phone;
                default -> {
                }
            }
        }
        return new DemoOnlinePresence(website, facebook, instagram, tiktok, youtube, linkedin, whatsapp);
    }

    private static String demoSlug(String name) {
        String slug = name.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (slug.isBlank()) {
            slug = "demo-biz-" + Math.abs(name.hashCode() % 100000);
        }
        return slug.length() > 40 ? slug.substring(0, 40) : slug;
    }

    private record DemoOnlinePresence(
            String website,
            String facebookUrl,
            String instagramUrl,
            String tiktokUrl,
            String youtubeUrl,
            String linkedinUrl,
            String whatsappUrl) {
    }

    private void createActivePartnership(long parentOrgId, long memberOrgId, LocalDateTime now) {
        jdbc.update(
                "INSERT INTO organization_partnerships (parent_organization_id, member_organization_id, status, "
                        + "initiated_by, initiated_at, accepted_at, created_at, updated_at) "
                        + "VALUES (?,?,?,?,?,?,?,?)",
                parentOrgId, memberOrgId, "ACTIVE", "PARENT", now, now, now, now);
        Long partnershipId = jdbc.queryForObject(
                "SELECT id FROM organization_partnerships WHERE parent_organization_id = ? AND member_organization_id = ?",
                Long.class, parentOrgId, memberOrgId);
        for (String module : List.of(
                FederationConstants.MODULE_BUSINESS_DIRECTORY,
                FederationConstants.MODULE_PUBLIC_EVENTS)) {
            jdbc.update(
                    "INSERT INTO organization_share_settings (partnership_id, module_key, enabled, share_level, created_at, updated_at) "
                            + "VALUES (?,?,?,?,?,?)",
                    partnershipId, module, true, "SIBLINGS", now, now);
        }
    }

    private long countOrganizations() {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM organizations", Long.class);
        return count == null ? 0L : count;
    }

    private boolean orgExists(String handle) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM organizations WHERE handle = ?", Long.class, handle);
        return count != null && count > 0;
    }

    public record DemoDataStatusDTO(
            boolean seeded,
            boolean canCreate,
            String message,
            List<DemoDataCatalog.Credential> credentials
    ) {
    }
}

package com.mosque.crm.service;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.hibernate.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.mosque.crm.entity.User;
import com.mosque.crm.entity.UserRole;
import com.mosque.crm.multitenancy.TenantContext;
import com.mosque.crm.repository.PermissionRepository;
import com.mosque.crm.repository.UserRepository;
import com.mosque.crm.repository.UserRoleRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * Central authorization service. All permission checks go through here.
 * <p>
 * <b>Never check role names directly.</b> Always check permission codes.
 * <p>
 * Permissions are resolved from the database via active (time-bound, organization-scoped)
 * role assignments, then cached per user for performance. The cache entry expires
 * after {@link #CACHE_TTL_MS} milliseconds.
 */
@Service("auth")
public class AuthorizationService {

    private static final Logger log = LoggerFactory.getLogger(AuthorizationService.class);

    /** Cache TTL – 5 minutes. */
    private static final long CACHE_TTL_MS = TimeUnit.MINUTES.toMillis(5);

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PermissionRepository permissionRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /** userId → CachedPermissions */
    private final Map<Long, CachedPermissions> cache = new ConcurrentHashMap<>();

    public AuthorizationService(UserRepository userRepository,
                                UserRoleRepository userRoleRepository,
                                PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.permissionRepository = permissionRepository;
    }

    // ─── public API (called from @PreAuthorize or controllers) ───────────

    /** Super admin "god mode" permission — grants implicit access to everything. */
    private static final String SUPERADMIN_PERMISSION = "superadmin.manage";

    /**
     * Check if the currently authenticated user holds the given permission code.
     * This is the primary method used in {@code @PreAuthorize("@auth.hasPermission('member.edit')")}.
     * Users with {@code superadmin.manage} implicitly hold every permission.
     */
    public boolean hasPermission(String permissionCode) {
        Set<String> perms = getPermissionsForCurrentUser();
        return perms.contains(SUPERADMIN_PERMISSION) || perms.contains(permissionCode);
    }

    /**
     * Check if the currently authenticated user holds <em>any</em> of the given permission codes.
     * Used in {@code @PreAuthorize("@auth.hasAnyPermission('a','b')")}.
     * Users with {@code superadmin.manage} implicitly hold every permission.
     */
    public boolean hasAnyPermission(String... permissionCodes) {
        Set<String> perms = getPermissionsForCurrentUser();
        if (perms.contains(SUPERADMIN_PERMISSION)) {
            return true;
        }
        for (String code : permissionCodes) {
            if (perms.contains(code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if the current user can access a resource that belongs to the given organizationId.
     * Combines permission check with organization-scope enforcement.
     * Super admins (with {@code superadmin.manage}) bypass organization scope checks.
     */
    public boolean hasPermissionForOrganization(String permissionCode, Long resourceOrganizationId) {
        User user = getCurrentUser();
        if (user == null) {
            return false;
        }
        Set<String> perms = getPermissions(user.getId());
        if (perms.contains(SUPERADMIN_PERMISSION)) {
            return true;
        }
        // Organization scope check
        if (user.getOrganizationId() != null && !user.getOrganizationId().equals(resourceOrganizationId)) {
            log.warn("Organization scope violation: user {} (organization {}) tried to access resource in organization {}",
                    user.getUsername(), user.getOrganizationId(), resourceOrganizationId);
            return false;
        }
        return perms.contains(permissionCode);
    }

    /**
     * Return the full set of effective permission codes for the current user.
     * Used by the {@code /api/me} endpoint to send permissions to the frontend.
     */
    public Set<String> getPermissionsForCurrentUser() {
        User user = getCurrentUser();
        if (user == null) {
            return Collections.emptySet();
        }
        return getPermissions(user.getId());
    }

    /**
     * Return the current authenticated {@link User} entity, or {@code null}.
     * <p>
     * Temporarily disables the Hibernate organization filter so the current
     * user is always resolvable regardless of the active tenant context
     * (e.g. super admin with NULL organization_id viewing a specific organization).
     * <p>
     * Uses a direct JPQL query on the EntityManager (instead of the Spring Data
     * repository) to guarantee the filter disable and query execute on the
     * exact same Hibernate Session.
     */
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String username = authentication.getName();
        if ("anonymousUser".equals(username)) {
            return null;
        }

        Session session = entityManager.unwrap(Session.class);
        boolean filterWasEnabled = session.getEnabledFilter("organizationFilter") != null;
        if (filterWasEnabled) {
            session.disableFilter("organizationFilter");
        }
        try {
            return entityManager
                    .createQuery("SELECT u FROM User u LEFT JOIN FETCH u.roles WHERE u.username = :username", User.class)
                    .setParameter("username", username)
                    .getResultStream()
                    .findFirst()
                    .orElse(null);
        } finally {
            if (filterWasEnabled) {
                Long orgId = TenantContext.getCurrentOrganizationId();
                if (orgId != null) {
                    session.enableFilter("organizationFilter")
                            .setParameter("organizationId", orgId);
                }
            }
        }
    }

    /**
     * Evict the cached permissions for a specific user.
     * Call this after role or permission changes.
     */
    public void evictCache(Long userId) {
        cache.remove(userId);
    }

    /**
     * Evict all cached permissions.
     */
    public void evictAllCaches() {
        cache.clear();
    }

    // ─── internal ────────────────────────────────────────────────────────

    /**
     * Return permissions for a specific user by ID (public API for when
     * SecurityContextHolder is not yet populated, e.g. during login).
     */
    public Set<String> getPermissions(Long userId) {
        CachedPermissions cached = cache.get(userId);
        if (cached != null && !cached.isExpired()) {
            return cached.permissions;
        }

        Set<String> resolved = resolvePermissions(userId);
        cache.put(userId, new CachedPermissions(resolved));
        return resolved;
    }

    /**
     * Resolve permissions from the database:
     * 1. Find all UserRole entries for this user
     * 2. Filter to only active (date-aware) assignments
     * 3. Collect the role IDs
     * 4. Query role_permissions → permissions to get permission codes
     */
    private Set<String> resolvePermissions(Long userId) {
        List<UserRole> userRoles = userRoleRepository.findByIdUserId(userId);

        Set<Long> activeRoleIds = userRoles.stream()
                .filter(UserRole::isActive)
                .map(UserRole::getRoleId)
                .collect(Collectors.toSet());

        if (activeRoleIds.isEmpty()) {
            return Collections.emptySet();
        }

        Set<String> permissions = permissionRepository.findPermissionCodesByRoleIds(activeRoleIds);
        log.debug("Resolved {} permissions for user {}: {}", permissions.size(), userId, permissions);
        return permissions;
    }

    // ─── cache entry ─────────────────────────────────────────────────────

    private static class CachedPermissions {
        final Set<String> permissions;
        final long createdAt;

        CachedPermissions(Set<String> permissions) {
            this.permissions = Collections.unmodifiableSet(permissions);
            this.createdAt = System.currentTimeMillis();
        }

        boolean isExpired() {
            return (System.currentTimeMillis() - createdAt) > CACHE_TTL_MS;
        }
    }
}

package com.mosque.crm.multitenancy;

/**
 * Thread-local holder for the current mosque (tenant) context.
 *
 * Set by {@link TenantInterceptor} after JWT authentication.
 * Read by:
 * - Hibernate filter enablement (to scope SELECT queries)
 * - {@link MosqueEntityListener} (to auto-set mosque_id on INSERT)
 * - Services that need the current mosque context
 *
 * When the value is {@code null}, the user is a super administrator
 * and the Hibernate tenant filter is NOT applied (they see all data).
 */
public final class TenantContext {

    private static final ThreadLocal<Long> CURRENT_MOSQUE_ID = new ThreadLocal<>();

    private TenantContext() {
        // utility class
    }

    /**
     * Get the current mosque ID for this request thread.
     * Returns null for super administrators.
     */
    public static Long getCurrentMosqueId() {
        return CURRENT_MOSQUE_ID.get();
    }

    /**
     * Set the current mosque ID for this request thread.
     * Pass null for super administrators.
     */
    public static void setCurrentMosqueId(Long mosqueId) {
        CURRENT_MOSQUE_ID.set(mosqueId);
    }

    /**
     * Clear the tenant context. Must be called at the end of each request
     * to prevent ThreadLocal leaks in thread pools.
     */
    public static void clear() {
        CURRENT_MOSQUE_ID.remove();
    }

    /**
     * Returns true if the current user is a super administrator (no mosque scope).
     */
    public static boolean isSuperAdmin() {
        return CURRENT_MOSQUE_ID.get() == null;
    }
}

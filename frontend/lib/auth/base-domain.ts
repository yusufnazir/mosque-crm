/**
 * Shared app base-domain resolution for subdomain multi-tenancy.
 *
 * Handles nested bases such as `demo.memflox.com` (host `admin.demo.memflox.com`)
 * without hardcoding environment-specific domains.
 *
 * Convention: tenant / role subdomains are a single DNS label
 * (`admin`, `auth`, `demo-baiturrochim`), so the base domain is "everything
 * after the first label" when no explicit config matches.
 */

export function normalizeHostname(hostname: string): string {
  return hostname.split(':')[0].trim().toLowerCase();
}

/** True if host is exactly baseDomain or a subdomain of it. */
export function hostMatchesBaseDomain(hostname: string, baseDomain: string): boolean {
  const host = normalizeHostname(hostname);
  const base = baseDomain.trim().toLowerCase();
  if (!host || !base) return false;
  return host === base || host.endsWith(`.${base}`);
}

/**
 * Fallback when nothing is configured: treat the first label as the subdomain
 * and the remainder as the app base domain.
 *
 * - admin.memflox.com              → memflox.com
 * - admin.demo.memflox.com         → demo.memflox.com
 * - demo-baiturrochim.demo.memflox.com → demo.memflox.com
 *
 * Note: apex hosts that ARE the base domain (e.g. demo.memflox.com) cannot be
 * detected this way — prefer auth.<base> or set APP_BASE_DOMAIN / cookie.
 */
export function inferBaseDomainFromHost(hostname: string): string | undefined {
  const host = normalizeHostname(hostname);
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined;
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 3) return undefined;
  return parts.slice(1).join('.');
}

/**
 * Resolve the effective app base domain for a request/page.
 *
 * Prefers configured candidates that match the current host (longest match
 * wins, so `demo.memflox.com` beats `memflox.com`). Falls back to inference.
 */
export function resolveBaseDomain(
  hostname: string,
  candidates: Array<string | null | undefined> = [],
): string | undefined {
  const host = normalizeHostname(hostname);
  const matching = candidates
    .map((c) => (typeof c === 'string' ? c.trim().toLowerCase() : ''))
    .filter((c) => c.includes('.'))
    .filter((c) => hostMatchesBaseDomain(host, c))
    .sort((a, b) => b.length - a.length);

  if (matching.length > 0) return matching[0];
  return inferBaseDomainFromHost(host);
}

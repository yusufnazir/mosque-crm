import { NextResponse } from 'next/server';
import { inferBaseDomainFromHost as inferFromHost } from '@/lib/auth/base-domain';

/** @deprecated Prefer resolveBaseDomain from '@/lib/auth/base-domain'. Kept for call-site compatibility. */
export function inferBaseDomainFromHost(hostname: string): string | undefined {
  return inferFromHost(hostname);
}

const SECURE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

/**
 * Append a raw Set-Cookie header that expires a cookie.
 * Unlike response.cookies.set(), response.headers.append() produces a separate
 * Set-Cookie header even when the name is the same, which is required when we
 * need to expire both a host-only cookie and a domain-scoped cookie in one
 * response.  If we used response.cookies.set() for both, the second call would
 * silently overwrite the first (ResponseCookies is keyed by name), leaving the
 * host-only cookie alive and able to shadow the freshly-set domain cookie.
 */
function appendExpireCookie(response: NextResponse, name: string, extra: string) {
  response.headers.append(
    'Set-Cookie',
    `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${SECURE}; SameSite=Lax${extra}`,
  );
}

export function clearAuthCookies(response: NextResponse, baseDomain?: string) {
  // Expire host-only variants via raw headers (response.cookies.set would be
  // overwritten by the later domain-scoped set, never reaching the browser).
  appendExpireCookie(response, 'session_token', '; HttpOnly');
  appendExpireCookie(response, 'org_handle', '');
  appendExpireCookie(response, 'app_base_domain', '');

  if (baseDomain) {
    // Also expire the domain-scoped variants.
    const domain = `; Domain=.${baseDomain}`;
    appendExpireCookie(response, 'session_token', `; HttpOnly${domain}`);
    appendExpireCookie(response, 'org_handle', domain);
    appendExpireCookie(response, 'app_base_domain', domain);
  }

  return response;
}
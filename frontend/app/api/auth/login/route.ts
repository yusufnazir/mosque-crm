import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, inferBaseDomainFromHost } from '@/lib/auth/server-cookies';

/**
 * BFF login endpoint.
 *
 * 1. Forwards credentials to Spring Boot /auth/login
 * 2. Extracts the JWT from the response
 * 3. Stores it as an httpOnly cookie (invisible to JS / XSS)
 * 4. Stores the org handle as a readable cookie for subdomain routing
 * 5. Returns the rest of the user data to the browser (without the token)
 *
 * Cookie domain is resolved from backend runtime configuration (appBaseDomain)
 * and falls back to NEXT_PUBLIC_BASE_DOMAIN when needed.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080/api';
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN;

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Forward login to Spring Boot
  const upstream = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();

  // If login failed, pass through the error
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const hostBasedDomain = inferBaseDomainFromHost(request.headers.get('host') || request.nextUrl.hostname);
  const configuredBaseDomain = typeof data.appBaseDomain === 'string' && data.appBaseDomain.trim().length > 0
    ? data.appBaseDomain.trim()
    : undefined;
  // Host header is the most reliable source — it matches the actual browser domain.
  // The DB-configured domain is only a fallback (it may be stale or for a different env).
  const effectiveBaseDomain = hostBasedDomain ?? configuredBaseDomain ?? BASE_DOMAIN;

  // Extract token — do not send token to browser.
  // organizationHandle IS included in the response so the login page can
  // redirect the user to their correct tenant subdomain.
  const { token, ...userData } = data;

  const response = NextResponse.json(userData, { status: 200 });

  // Remove any stale host-only auth cookies before writing the shared-domain
  // cookies. Otherwise an older empty session_token on admin.lvh.me can shadow
  // the new .lvh.me cookie and make the first post-login hydration request fail.
  clearAuthCookies(response, effectiveBaseDomain);

  // Shared cookie options — add wildcard domain when BASE_DOMAIN is configured
  const cookieOpts = {
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours — matches JWT expiration
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    ...(effectiveBaseDomain ? { domain: `.${effectiveBaseDomain}` } : {}),
  };

  // JWT in httpOnly cookie — invisible to JavaScript
  response.cookies.set('session_token', token, { ...cookieOpts, httpOnly: true });

  // Org handle in readable cookie — used by middleware for subdomain routing
  response.cookies.set('org_handle', userData.organizationHandle ?? '', { ...cookieOpts, httpOnly: false });
  response.cookies.set('app_base_domain', effectiveBaseDomain ?? '', { ...cookieOpts, httpOnly: false });

  return response;
}

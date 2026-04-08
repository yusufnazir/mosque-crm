import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for route protection and subdomain-based multi-tenancy.
 *
 * When NEXT_PUBLIC_BASE_DOMAIN is set (e.g. "lvh.me"):
 *  - auth.<domain>  → login entry point
 *  - <handle>.<domain> → tenant application
 *
 * Auth flow:
 *  1. Unauthenticated request to a tenant subdomain → redirect to auth.<domain>/login
 *  2. Authenticated user on auth subdomain → redirect to <org_handle>.<domain>/
 *  3. Authenticated user on wrong tenant subdomain → redirect to their own subdomain
 *
 * When BASE_DOMAIN is NOT set, falls back to original single-origin behaviour.
 *
 * Cookies used:
 *  - session_token (httpOnly) — presence = authenticated
 *  - org_handle   (readable)  — which tenant the user belongs to
 */

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN;

// The subdomain used by the super admin. Must match NEXT_PUBLIC_SUPERADMIN_SUBDOMAIN in .env.
// Change it in .env.local (and backend application.properties) — never hard-code it here.
const SUPERADMIN_SUBDOMAIN = process.env.NEXT_PUBLIC_SUPERADMIN_SUBDOMAIN || 'admin';

// Subdomains that are never treated as tenant handles.
// 'auth' is the login entry point. The super admin subdomain is handled as a special tenant.
const RESERVED_SUBDOMAINS = new Set(['www', 'login', 'auth', 'app', 'api', 'mail']);

// Routes accessible without authentication
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

function getSubdomain(hostname: string): string | null {
  if (!BASE_DOMAIN) return null;
  // hostname may include port on localhost (lvh.me:3000) — strip it
  const host = hostname.split(':')[0];
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return null;
  const sub = host.slice(0, host.length - BASE_DOMAIN.length - 1);
  return sub || null;
}

function buildUrl(subdomain: string, req: NextRequest, path: string): string {
  const { protocol } = req.nextUrl;
  const port = req.nextUrl.port ? `:${req.nextUrl.port}` : '';
  return `${protocol}//${subdomain}.${BASE_DOMAIN}${port}${path}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || request.nextUrl.hostname;

  // Skip API routes and static assets — always pass through
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session_token')?.value;
  const orgHandle = request.cookies.get('org_handle')?.value;

  // ── Subdomain-aware mode ─────────────────────────────────────────────────────
  if (BASE_DOMAIN) {
    const subdomain = getSubdomain(hostname);
    const isAuthSubdomain = subdomain === 'auth';
    const isTenantSubdomain = subdomain !== null && !RESERVED_SUBDOMAINS.has(subdomain);

    if (isAuthSubdomain) {
      // On auth.domain:
      //  - Authenticated user → redirect to their tenant subdomain
      //  - Unauthenticated → let login page render normally
      if (token && orgHandle) {
        const dest = buildUrl(orgHandle, request, '/dashboard');
        return NextResponse.redirect(dest);
      }
      // Already on login page — don't redirect loop
      return NextResponse.next();
    }

    if (isTenantSubdomain) {
      // On <handle>.domain:
      //  - Unauthenticated → redirect to auth subdomain login
      if (!token) {
        const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
        if (!isPublicPath) {
          const loginUrl = buildUrl('auth', request, `/login?returnTo=${encodeURIComponent(request.url)}`);
          return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
      }

      // Authenticated but visiting the wrong tenant subdomain
      if (orgHandle && orgHandle !== subdomain) {
        const dest = buildUrl(orgHandle, request, pathname + request.nextUrl.search);
        return NextResponse.redirect(dest);
      }

      // Authenticated user on root → go to dashboard
      if (token && pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      return NextResponse.next();
    }

    // No recognisable subdomain (e.g. bare lvh.me:3000) — redirect to auth
    if (subdomain === null) {
      const dest = buildUrl('auth', request, '/login');
      return NextResponse.redirect(dest);
    }
  }

  // ── Single-origin fallback (no BASE_DOMAIN) ──────────────────────────────────
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};

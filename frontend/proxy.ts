import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js proxy for route protection and subdomain-based multi-tenancy.
 *
 * When NEXT_PUBLIC_BASE_DOMAIN is set (e.g. "lvh.me"):
 *  - auth.<domain>  -> login entry point
 *  - <handle>.<domain> -> tenant application
 */

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN;
const SUPERADMIN_SUBDOMAIN = process.env.NEXT_PUBLIC_SUPERADMIN_SUBDOMAIN || 'admin';
const RESERVED_SUBDOMAINS = new Set(['www', 'login', 'auth', 'app', 'api', 'mail']);
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/register-member', '/complete-registration'];

function inferBaseDomainFromHost(hostname: string): string | null {
  const host = hostname.split(':')[0].trim().toLowerCase();
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 3) return null;
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

function getEffectiveBaseDomain(request: NextRequest): string | null {
  const hostHeader = request.headers.get('host') || request.nextUrl.hostname;
  const inferred = inferBaseDomainFromHost(hostHeader);
  if (inferred) return inferred;

  const cookieDomain = request.cookies.get('app_base_domain')?.value?.trim();
  if (cookieDomain) return cookieDomain;
  return BASE_DOMAIN ?? null;
}

function getSubdomain(hostname: string, baseDomain: string | null): string | null {
  if (!baseDomain) return null;
  const host = hostname.split(':')[0];
  if (!host.endsWith(`.${baseDomain}`)) return null;
  const sub = host.slice(0, host.length - baseDomain.length - 1);
  return sub || null;
}

function buildUrl(subdomain: string, req: NextRequest, path: string, baseDomain: string): string {
  // Use X-Forwarded-Proto when behind a reverse proxy (e.g. Nginx SSL termination)
  const protocol = req.headers.get('x-forwarded-proto')
    ? `${req.headers.get('x-forwarded-proto')}:`
    : req.nextUrl.protocol;
  // Derive port from the Host header — NOT from req.nextUrl.port which returns
  // the internal Docker/Node port (e.g. 3000) instead of the external port.
  const hostHeader = req.headers.get('host') || '';
  const hostPort = hostHeader.includes(':') ? hostHeader.split(':').pop() : '';
  const port = hostPort ? `:${hostPort}` : '';
  return `${protocol}//${subdomain}.${baseDomain}${port}${path}`;
}

function isRscFetch(request: NextRequest): boolean {
  return (
    request.headers.get('RSC') !== null ||
    request.headers.get('Next-Router-State-Tree') !== null ||
    request.headers.get('Next-Router-Prefetch') !== null ||
    request.nextUrl.searchParams.has('_rsc')
  );
}

function withSameDomainCors(response: NextResponse, origin: string | null, baseDomain: string | null): NextResponse {
  if (!origin || !baseDomain) return response;
  const originHost = origin.replace(/^https?:\/\//, '').split(':')[0];
  if (originHost === baseDomain || originHost.endsWith(`.${baseDomain}`)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

function getEffectiveProtocol(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-proto');
  return forwarded ? `${forwarded}:` : req.nextUrl.protocol;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || request.nextUrl.hostname;
  const effectiveBaseDomain = getEffectiveBaseDomain(request);
  const effectiveProtocol = getEffectiveProtocol(request);

  if (request.method === 'OPTIONS' && effectiveBaseDomain) {
    const origin = request.headers.get('origin');
    if (origin) {
      const originHost = origin.replace(/^https?:\/\//, '').split(':')[0];
      if (originHost === effectiveBaseDomain || originHost.endsWith(`.${effectiveBaseDomain}`)) {
        const preflight = new NextResponse(null, { status: 204 });
        preflight.headers.set('Access-Control-Allow-Origin', origin);
        preflight.headers.set('Access-Control-Allow-Credentials', 'true');
        preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        preflight.headers.set(
          'Access-Control-Allow-Headers',
          request.headers.get('access-control-request-headers') ||
            'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, Content-Type, X-Mosque-Id, X-Organization-Id',
        );
        preflight.headers.set('Access-Control-Max-Age', '86400');
        preflight.headers.set('Vary', 'Origin');
        return preflight;
      }
    }
  }

  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    // Static files (images, fonts, icons) must never be redirected to the auth
    // login page — that would trigger an unnecessary Next.js compilation cascade
    // and cause the devBuildId to change mid-test, breaking Playwright E2E tests.
    /\.(svg|png|jpg|jpeg|gif|ico|webp|woff|woff2|ttf|eot|otf)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session_token')?.value;
  const orgHandle = request.cookies.get('org_handle')?.value;

  if (effectiveBaseDomain) {
    const subdomain = getSubdomain(hostname, effectiveBaseDomain);
    const isAuthSubdomain = subdomain === 'auth';
    const isTenantSubdomain = subdomain !== null && !RESERVED_SUBDOMAINS.has(subdomain);

    if (isAuthSubdomain) {
      if (token && orgHandle) {
        const targetPath = pathname === '/' ? '/dashboard' : `${pathname}${request.nextUrl.search}`;
        const dest = buildUrl(orgHandle, request, targetPath, effectiveBaseDomain);
        const redirectResponse = NextResponse.redirect(dest);
        withSameDomainCors(
          redirectResponse,
          request.headers.get('origin') || `${effectiveProtocol}//${hostname}`,
          effectiveBaseDomain,
        );
        return redirectResponse;
      }
      return NextResponse.next();
    }

    if (isTenantSubdomain) {
      if (!token) {
        const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
        if (!isPublicPath) {
          const realUrl = `${effectiveProtocol}//${hostname}${pathname}${request.nextUrl.search}`;
          const loginUrl = buildUrl('auth', request, `/login?returnTo=${encodeURIComponent(realUrl)}`, effectiveBaseDomain);
          return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
      }

      if (orgHandle && orgHandle !== subdomain) {
        const dest = buildUrl(orgHandle, request, pathname + request.nextUrl.search, effectiveBaseDomain);
        return NextResponse.redirect(dest);
      }

      if (token && pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      const origin = request.headers.get('origin');
      if (isRscFetch(request) && origin) {
        return withSameDomainCors(NextResponse.next(), origin, effectiveBaseDomain);
      }

      return NextResponse.next();
    }

    if (subdomain === null) {
      const dest = buildUrl('auth', request, '/login', effectiveBaseDomain);
      return NextResponse.redirect(dest);
    }
  }

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
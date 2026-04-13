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

function getSubdomain(hostname: string): string | null {
  if (!BASE_DOMAIN) return null;
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

function isRscFetch(request: NextRequest): boolean {
  return (
    request.headers.get('RSC') !== null ||
    request.headers.get('Next-Router-State-Tree') !== null ||
    request.headers.get('Next-Router-Prefetch') !== null ||
    request.nextUrl.searchParams.has('_rsc')
  );
}

function withSameDomainCors(response: NextResponse, origin: string | null): NextResponse {
  if (!origin || !BASE_DOMAIN) return response;
  const originHost = origin.replace(/^https?:\/\//, '').split(':')[0];
  if (originHost === BASE_DOMAIN || originHost.endsWith(`.${BASE_DOMAIN}`)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || request.nextUrl.hostname;

  if (request.method === 'OPTIONS' && BASE_DOMAIN) {
    const origin = request.headers.get('origin');
    if (origin) {
      const originHost = origin.replace(/^https?:\/\//, '').split(':')[0];
      if (originHost === BASE_DOMAIN || originHost.endsWith(`.${BASE_DOMAIN}`)) {
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
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session_token')?.value;
  const orgHandle = request.cookies.get('org_handle')?.value;

  if (BASE_DOMAIN) {
    const subdomain = getSubdomain(hostname);
    const isAuthSubdomain = subdomain === 'auth';
    const isTenantSubdomain = subdomain !== null && !RESERVED_SUBDOMAINS.has(subdomain);

    if (isAuthSubdomain) {
      if (token && orgHandle && !isRscFetch(request)) {
        const dest = buildUrl(orgHandle, request, '/dashboard');
        const redirectResponse = NextResponse.redirect(dest);
        withSameDomainCors(
          redirectResponse,
          request.headers.get('origin') || `${request.nextUrl.protocol}//${hostname}`,
        );
        return redirectResponse;
      }
      return NextResponse.next();
    }

    if (isTenantSubdomain) {
      if (!token) {
        const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
        if (!isPublicPath) {
          const realUrl = `${request.nextUrl.protocol}//${hostname}${pathname}${request.nextUrl.search}`;
          const loginUrl = buildUrl('auth', request, `/login?returnTo=${encodeURIComponent(realUrl)}`);
          return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
      }

      if (orgHandle && orgHandle !== subdomain) {
        const dest = buildUrl(orgHandle, request, pathname + request.nextUrl.search);
        return NextResponse.redirect(dest);
      }

      if (token && pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      const origin = request.headers.get('origin');
      if (isRscFetch(request) && origin) {
        return withSameDomainCors(NextResponse.next(), origin);
      }

      return NextResponse.next();
    }

    if (subdomain === null) {
      const dest = buildUrl('auth', request, '/login');
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
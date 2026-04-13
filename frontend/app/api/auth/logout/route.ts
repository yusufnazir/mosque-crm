import { NextRequest, NextResponse } from 'next/server';

/**
 * BFF logout endpoint.
 *
 * Clears the session_token and org_handle cookies, effectively logging the user out.
 * When BASE_DOMAIN is set, cookies are cleared with the same wildcard domain that
 * was used when setting them (Domain=.<base-domain>) — required for cross-subdomain clearing.
 *
 * Supports both POST (from fetch) and GET (direct browser navigation for reliability).
 */

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN;

function inferBaseDomainFromHost(hostname: string): string | undefined {
  const host = hostname.split(':')[0].trim().toLowerCase();
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined;
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 3) return undefined;
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

function getEffectiveBaseDomain(request: NextRequest): string | undefined {
  const cookieDomain = request.cookies.get('app_base_domain')?.value?.trim();
  if (cookieDomain) {
    return cookieDomain;
  }
  const hostHeader = request.headers.get('host') || request.nextUrl.hostname;
  const inferred = inferBaseDomainFromHost(hostHeader);
  if (inferred) {
    return inferred;
  }
  return BASE_DOMAIN;
}

function clearCookies(response: NextResponse, baseDomain?: string) {
  const clearOpts = {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    ...(baseDomain ? { domain: `.${baseDomain}` } : {}),
  };

  response.cookies.set('session_token', '', { ...clearOpts, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const });
  response.cookies.set('org_handle', '', { ...clearOpts, httpOnly: false, sameSite: 'lax' as const });
  response.cookies.set('app_base_domain', '', { ...clearOpts, httpOnly: false, sameSite: 'lax' as const });
  return response;
}

export async function POST(request: NextRequest) {
  return clearCookies(NextResponse.json({ message: 'Logged out' }, { status: 200 }), getEffectiveBaseDomain(request));
}

export async function GET(request: NextRequest) {
  // Direct browser navigation — redirect to auth login after clearing cookies.
  // Use X-Forwarded-Proto for the real protocol (Nginx SSL termination).
  // Derive port from Host header — NOT req.nextUrl.port which returns
  // the internal Docker/Node port (e.g. 3000) instead of the external port.
  const forwarded = request.headers.get('x-forwarded-proto');
  const protocol = forwarded ? `${forwarded}:` : request.nextUrl.protocol;
  const hostHeader = request.headers.get('host') || '';
  const hostPort = hostHeader.includes(':') ? hostHeader.split(':').pop() : '';
  const port = hostPort ? `:${hostPort}` : '';
  const baseDomain = getEffectiveBaseDomain(request);

  let redirectUrl: string;
  if (baseDomain) {
    redirectUrl = `${protocol}//auth.${baseDomain}${port}/login`;
  } else {
    const host = request.headers.get('host') || 'localhost:3000';
    redirectUrl = `${protocol}//${host}/login`;
  }

  return clearCookies(NextResponse.redirect(redirectUrl), baseDomain);
}

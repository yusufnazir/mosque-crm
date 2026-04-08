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

function clearCookies(response: NextResponse) {
  const clearOpts = {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    ...(BASE_DOMAIN ? { domain: `.${BASE_DOMAIN}` } : {}),
  };

  response.cookies.set('session_token', '', { ...clearOpts, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const });
  response.cookies.set('org_handle', '', { ...clearOpts, httpOnly: false, sameSite: 'lax' as const });
  return response;
}

export async function POST() {
  return clearCookies(NextResponse.json({ message: 'Logged out' }, { status: 200 }));
}

export async function GET(request: NextRequest) {
  // Direct browser navigation — redirect to auth login after clearing cookies
  // Use request.nextUrl.protocol (includes the colon, e.g. "http:") so the
  // redirect URL is always valid regardless of x-forwarded-proto header.
  const protocol = request.nextUrl.protocol; // 'http:' or 'https:'
  const port = request.nextUrl.port ? `:${request.nextUrl.port}` : '';

  let redirectUrl: string;
  if (BASE_DOMAIN) {
    redirectUrl = `${protocol}//auth.${BASE_DOMAIN}${port}/login`;
  } else {
    const host = request.headers.get('host') || 'localhost:3000';
    redirectUrl = `${protocol}//${host}/login`;
  }

  return clearCookies(NextResponse.redirect(redirectUrl));
}

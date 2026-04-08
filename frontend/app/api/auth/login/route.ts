import { NextRequest, NextResponse } from 'next/server';

/**
 * BFF login endpoint.
 *
 * 1. Forwards credentials to Spring Boot /auth/login
 * 2. Extracts the JWT from the response
 * 3. Stores it as an httpOnly cookie (invisible to JS / XSS)
 * 4. Stores the org handle as a readable cookie for subdomain routing
 * 5. Returns the rest of the user data to the browser (without the token)
 *
 * When NEXT_PUBLIC_BASE_DOMAIN is set (e.g. "lvh.me"), both cookies are set
 * with Domain=.<base-domain> so they are shared across all subdomains.
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

  // Extract token (and optional org handle) — do not send token to browser
  const { token, organizationHandle, ...userData } = data;

  const response = NextResponse.json(userData, { status: 200 });

  // Shared cookie options — add wildcard domain when BASE_DOMAIN is configured
  const cookieOpts = {
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours — matches JWT expiration
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    ...(BASE_DOMAIN ? { domain: `.${BASE_DOMAIN}` } : {}),
  };

  // JWT in httpOnly cookie — invisible to JavaScript
  response.cookies.set('session_token', token, { ...cookieOpts, httpOnly: true });

  // Org handle in readable cookie — used by middleware for subdomain routing
  response.cookies.set('org_handle', organizationHandle ?? '', { ...cookieOpts, httpOnly: false });

  return response;
}

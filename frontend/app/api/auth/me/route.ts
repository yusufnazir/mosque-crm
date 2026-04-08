import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * BFF /api/auth/me endpoint.
 *
 * Used for cross-subdomain auth hydration. When a user navigates from
 * auth.<domain> to <org>.domain>, their localStorage is empty (different origin)
 * but the httpOnly session_token cookie travels with the request.
 *
 * AuthContext calls this endpoint to rebuild the user session from the cookie.
 * On failure, stale cookies are cleared to prevent middleware redirect loops.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080/api';
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  // Forward to Spring Boot /me endpoint
  const upstream = await fetch(`${BACKEND_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!upstream.ok) {
    // Token is stale or invalid — clear cookies to prevent redirect loops
    const clearOpts = {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      ...(BASE_DOMAIN ? { domain: `.${BASE_DOMAIN}` } : {}),
    };
    const res = NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    res.cookies.set('session_token', '', { ...clearOpts, httpOnly: true, sameSite: 'lax' as const });
    res.cookies.set('org_handle', '', { ...clearOpts, httpOnly: false, sameSite: 'lax' as const });
    return res;
  }

  const data = await upstream.json();
  return NextResponse.json(data, { status: 200 });
}

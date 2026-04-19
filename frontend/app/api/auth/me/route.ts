import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/server-cookies';

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
  const effectiveBaseDomain = cookieStore.get('app_base_domain')?.value?.trim() || BASE_DOMAIN;

  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  // Forward to Spring Boot /me endpoint
  const upstream = await fetch(`${BACKEND_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!upstream.ok) {
    // Token is stale or invalid — clear both host-only and shared-domain
    // cookies to prevent stale cookie shadowing across subdomains.
    return clearAuthCookies(NextResponse.json({ message: 'Not authenticated' }, { status: 401 }), effectiveBaseDomain);
  }

  const data = await upstream.json();
  return NextResponse.json(data, { status: 200 });
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for route protection.
 *
 * Checks for the session_token httpOnly cookie:
 *  - No cookie + protected route → redirect to /login
 *  - Has cookie + login page → redirect to /dashboard
 *
 * This runs on the Edge runtime (server-side) so it can read httpOnly cookies.
 * Note: this is a best-effort check (cookie might be expired). The real auth
 * validation happens when the API proxy forwards requests to Spring Boot.
 */

// Routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const { pathname } = request.nextUrl;

  // Skip API routes and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated user trying to access a protected page
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Authenticated user on the root page → go to dashboard
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Authenticated user trying to visit login → go to dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};

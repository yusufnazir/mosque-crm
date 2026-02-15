import { NextRequest, NextResponse } from 'next/server';

/**
 * BFF logout endpoint.
 *
 * Clears the session_token httpOnly cookie, effectively logging the user out.
 * Supports both POST (from fetch) and GET (direct browser navigation for reliability).
 */

function clearCookie(response: NextResponse) {
  response.cookies.set('session_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}

export async function POST() {
  return clearCookie(NextResponse.json({ message: 'Logged out' }, { status: 200 }));
}

export async function GET(request: NextRequest) {
  // Direct browser navigation — redirect to /login after clearing cookie
  // Use the Host header to preserve the original hostname (e.g. LAN IP on mobile)
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const redirectUrl = `${protocol}://${host}/login`;
  return clearCookie(NextResponse.redirect(redirectUrl));
}

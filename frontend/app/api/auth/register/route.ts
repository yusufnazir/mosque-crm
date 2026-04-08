import { NextRequest, NextResponse } from 'next/server';

/**
 * BFF registration endpoint.
 *
 * 1. Forwards registration data to Spring Boot /auth/register
 * 2. Extracts the JWT from the response
 * 3. Stores it as an httpOnly cookie (same as login)
 * 4. Returns the user data to the browser (without the token)
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080/api';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const upstream = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  // Extract token and return user data without it
  const { token, ...userData } = data;

  const response = NextResponse.json(userData, { status: 201 });

  // Set JWT as httpOnly cookie — same as login flow
  response.cookies.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  return response;
}

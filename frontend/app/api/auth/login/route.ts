import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * BFF login endpoint.
 *
 * 1. Forwards credentials to Spring Boot /auth/login
 * 2. Extracts the JWT from the response
 * 3. Stores it as an httpOnly cookie (invisible to JS / XSS)
 * 4. Returns the rest of the user data to the browser (without the token)
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080/api';

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

  // Extract token and return user data without it
  const { token, ...userData } = data;

  const response = NextResponse.json(userData, { status: 200 });

  // Set JWT as httpOnly cookie — invisible to JavaScript
  response.cookies.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // 24 hours — match the JWT expiration
    maxAge: 60 * 60 * 24,
  });

  return response;
}

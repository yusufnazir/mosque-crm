import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * BFF (Backend for Frontend) catch-all proxy.
 *
 * Every request to /api/<path> is forwarded to the Spring Boot backend.
 * The JWT token is read from an httpOnly cookie (never exposed to JS)
 * and attached as an Authorization header on the upstream request.
 *
 * This means:
 *  - The browser never sees the JWT
 *  - Spring Boot only needs to be reachable from the Next.js server (localhost)
 *  - No CORS issues — all browser requests stay on the same origin
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080/api';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetPath = path.join('/');
  const url = `${BACKEND_URL}/${targetPath}${request.nextUrl.search}`;

  // Read JWT from httpOnly cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  // Build upstream headers — pass through relevant ones
  const headers = new Headers();

  // Pass through Content-Type (important for multipart/form-data file uploads)
  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  // Attach JWT if present
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Pass through X-Mosque-Id for multi-tenancy
  const mosqueId = request.headers.get('X-Mosque-Id');
  if (mosqueId) {
    headers.set('X-Mosque-Id', mosqueId);
  }

  // Pass through Accept-Language
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    headers.set('Accept-Language', acceptLanguage);
  }

  // Forward the request to Spring Boot
  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    // Use arrayBuffer to handle both JSON and multipart/form-data
    body = await request.arrayBuffer();
  }

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  // Handle 204 No Content — must not include a body per HTTP spec
  if (upstream.status === 204) {
    const response = new NextResponse(null, {
      status: 204,
    });

    return response;
  }

  // Read the response
  const responseBody = await upstream.arrayBuffer();

  // Build the response to send back to the browser
  const responseHeaders = new Headers();
  const upstreamContentType = upstream.headers.get('Content-Type');
  if (upstreamContentType) {
    responseHeaders.set('Content-Type', upstreamContentType);
  }

  const response = new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });

  // If backend returns 401, clear the session cookie so the browser
  // knows the user is no longer authenticated
  if (upstream.status === 401) {
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  return response;
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;

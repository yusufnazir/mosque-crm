import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, inferBaseDomainFromHost } from '@/lib/auth/server-cookies';

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

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8200/api';

function getEffectiveBaseDomain(request: NextRequest): string | undefined {
  const cookieDomain = request.cookies.get('app_base_domain')?.value?.trim();
  if (cookieDomain) {
    return cookieDomain;
  }

  const hostHeader = request.headers.get('host') || request.nextUrl.hostname;
  return inferBaseDomainFromHost(hostHeader);
}

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

  // Pass through X-Organization-Id for multi-tenancy
  const organizationId = request.headers.get('X-Organization-Id');
  if (organizationId) {
    headers.set('X-Organization-Id', organizationId);
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

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backend unavailable';
    console.error(`[BFF] Upstream unreachable: ${url} — ${message}`);
    return NextResponse.json(
      { error: 'Backend service is temporarily unavailable. Please try again.', code: 'BACKEND_UNAVAILABLE' },
      { status: 503 },
    );
  }

  // Handle 204 No Content — must not include a body per HTTP spec
  if (upstream.status === 204) {
    const response = new NextResponse(null, {
      status: 204,
    });

    return response;
  }

  const responseBody = await upstream.arrayBuffer();
  const responseText = new TextDecoder().decode(responseBody);
  const upstreamContentType = upstream.headers.get('Content-Type') ?? '';

  // Expired/invalid JWT used to fall through as anonymous → 403; treat opaque 403 as 401
  if (upstream.status === 403 && token) {
    const isPlanGate =
      responseText.includes('PLAN_ENTITLEMENT_REQUIRED') ||
      responseText.includes('PLAN_LIMIT_EXCEEDED');
    if (!isPlanGate && (responseText.length === 0 || !upstreamContentType.includes('json'))) {
      const authResponse = NextResponse.json(
        { error: 'Session expired or invalid. Please sign in again.' },
        { status: 401 },
      );
      clearAuthCookies(authResponse, getEffectiveBaseDomain(request));
      return authResponse;
    }
  }

  const responseHeaders = new Headers();
  if (upstreamContentType) {
    responseHeaders.set('Content-Type', upstreamContentType);
  }

  const cacheControl = upstream.headers.get('Cache-Control');
  if (cacheControl) {
    responseHeaders.set('Cache-Control', cacheControl);
  }

  const response = new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });

  if (upstream.status === 401) {
    clearAuthCookies(response, getEffectiveBaseDomain(request));
  }

  return response;
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;

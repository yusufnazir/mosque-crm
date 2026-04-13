import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080/api';

/**
 * Returns the JWT token and the backend WebSocket URL.
 * The WS URL is derived server-side from BACKEND_URL so the browser
 * never needs to know the backend port/host.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // http://localhost:8200/api  →  ws://localhost:8200/ws
  const wsUrl = BACKEND_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '/ws');

  return NextResponse.json({ token, wsUrl });
}

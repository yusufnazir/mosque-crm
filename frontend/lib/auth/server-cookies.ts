import { NextResponse } from 'next/server';

export function inferBaseDomainFromHost(hostname: string): string | undefined {
  const host = hostname.split(':')[0].trim().toLowerCase();
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined;
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 3) return undefined;
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
}

export function clearAuthCookies(response: NextResponse, baseDomain?: string) {
  const clearBase = {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };

  const variants = baseDomain ? [clearBase, { ...clearBase, domain: `.${baseDomain}` }] : [clearBase];

  for (const options of variants) {
    response.cookies.set('session_token', '', {
      ...options,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    response.cookies.set('org_handle', '', {
      ...options,
      httpOnly: false,
      sameSite: 'lax',
    });
    response.cookies.set('app_base_domain', '', {
      ...options,
      httpOnly: false,
      sameSite: 'lax',
    });
  }

  return response;
}
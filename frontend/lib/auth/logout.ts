'use client';

import { getConfiguredBaseDomain } from '@/lib/auth/AuthContext';

function getLoginUrl(): string {
  if (typeof window === 'undefined') {
    return '/login';
  }

  const baseDomain = getConfiguredBaseDomain();
  const { protocol, hostname, port } = window.location;
  const portSuffix = port ? `:${port}` : '';

  if (baseDomain && (hostname === baseDomain || hostname.endsWith(`.${baseDomain}`))) {
    return `${protocol}//auth.${baseDomain}${portSuffix}/login`;
  }

  return `${protocol}//${hostname}${portSuffix}/login`;
}

export async function logoutClient(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('personId');
    localStorage.removeItem('memberId');
    localStorage.removeItem('selectedOrganization');
    localStorage.removeItem('selectedOrganizationId');
    localStorage.removeItem('lang');
  }

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch {
    // Even if the dev server route is temporarily unavailable, still continue to login.
  }

  if (typeof window !== 'undefined') {
    window.location.href = getLoginUrl();
  }
}

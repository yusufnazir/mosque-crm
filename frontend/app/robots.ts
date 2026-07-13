import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { absoluteOrigin, extractOrgHandleFromHost, fetchPublicDirectory } from '@/lib/publicDirectorySeo';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto');
  const orgHandle = extractOrgHandleFromHost(host);
  const origin = absoluteOrigin(host, proto);

  let allowDirectory = false;
  if (orgHandle) {
    const data = await fetchPublicDirectory(orgHandle, { page: 0, size: 1 });
    allowDirectory = Boolean(data?.enabled);
  }

  if (!allowDirectory) {
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/directory'],
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/directory'],
    },
    sitemap: `${origin}/directory/sitemap.xml`,
  };
}

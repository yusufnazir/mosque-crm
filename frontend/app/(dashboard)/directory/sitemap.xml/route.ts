import { headers } from 'next/headers';
import {
  absoluteOrigin,
  businessPublicPath,
  extractOrgHandleFromHost,
  fetchPublicSitemapEntries,
} from '@/lib/publicDirectorySeo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto');
  const orgHandle = extractOrgHandleFromHost(host);
  const origin = absoluteOrigin(host, proto);

  const entries = orgHandle ? await fetchPublicSitemapEntries(orgHandle) : [];

  const urls = [
    {
      loc: `${origin}/directory`,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: '1.0',
    },
    ...entries.map((entry) => ({
      loc: `${origin}${businessPublicPath(entry.id, entry.name || 'business')}`,
      lastmod: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : new Date().toISOString(),
      changefreq: 'weekly',
      priority: '0.8',
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

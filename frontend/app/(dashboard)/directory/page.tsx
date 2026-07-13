import type { Metadata } from 'next';
import { headers } from 'next/headers';
import DirectoryBrowseClient from './DirectoryBrowseClient';
import {
  absoluteOrigin,
  buildDirectoryListJsonLd,
  directoryListMetadata,
  extractOrgHandleFromHost,
  fetchPublicDirectory,
} from '@/lib/publicDirectorySeo';

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto');
  const orgHandle = extractOrgHandleFromHost(host);
  const origin = absoluteOrigin(host, proto);
  const data = orgHandle ? await fetchPublicDirectory(orgHandle, { page: 0, size: 12 }) : null;

  if (!orgHandle || !data) {
    return {
      title: 'Business Directory',
      description: 'Browse businesses registered with this organization.',
      robots: { index: false, follow: true },
    };
  }

  return directoryListMetadata({
    orgHandle,
    orgName: data.organizationName || orgHandle,
    enabled: Boolean(data.enabled),
    includesFederation: Boolean(data.includesFederationListings),
    origin,
    listingCount: data.totalElements,
  });
}

export default async function DirectoryPage() {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto');
  const orgHandle = extractOrgHandleFromHost(host);
  const origin = absoluteOrigin(host, proto);
  const data = orgHandle ? await fetchPublicDirectory(orgHandle, { page: 0, size: 48 }) : null;

  const jsonLd =
    data?.enabled && data.businesses?.length
      ? buildDirectoryListJsonLd({
          orgName: data.organizationName || orgHandle,
          origin,
          businesses: data.businesses,
        })
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {/* SSR snippet for crawlers — interactive UI loads in the client component */}
      {data?.enabled && data.businesses?.length ? (
        <noscript>
          <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold">
              {(data.organizationName || orgHandle) + ' Business Directory'}
            </h1>
            <ul className="mt-4 space-y-2 list-disc pl-5">
              {data.businesses.map((b) => (
                <li key={b.id}>
                  <a href={`/directory/${b.id}-${(b.name || 'business').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                    {b.name}
                  </a>
                  {b.description ? ` — ${b.description.slice(0, 160)}` : ''}
                </li>
              ))}
            </ul>
          </div>
        </noscript>
      ) : null}
      <DirectoryBrowseClient />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BusinessSocialLinks from '@/components/BusinessSocialLinks';
import CategoryPill from '@/components/CategoryPill';
import { formatPhoneNumber, phoneHref } from '@/lib/formatPhone';
import {
  absoluteOrigin,
  buildBusinessJsonLd,
  businessPublicPath,
  directoryDetailMetadata,
  extractOrgHandleFromHost,
  fetchPublicBusiness,
  parseBusinessKey,
} from '@/lib/publicDirectorySeo';

type Props = {
  params: Promise<{ businessKey: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessKey } = await params;
  const businessId = parseBusinessKey(businessKey);
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto');
  const orgHandle = extractOrgHandleFromHost(host);
  const origin = absoluteOrigin(host, proto);

  if (!businessId || !orgHandle) {
    return { title: 'Business', robots: { index: false, follow: false } };
  }

  const business = await fetchPublicBusiness(orgHandle, businessId);
  if (!business) {
    return { title: 'Business not found', robots: { index: false, follow: false } };
  }

  const path = businessPublicPath(business.id, business.name);
  return directoryDetailMetadata({
    orgName: business.listedByOrganizationName || orgHandle,
    business,
    origin,
    path,
  });
}

export default async function PublicBusinessDetailPage({ params }: Props) {
  const { businessKey } = await params;
  const businessId = parseBusinessKey(businessKey);
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto');
  const orgHandle = extractOrgHandleFromHost(host);
  const origin = absoluteOrigin(host, proto);

  if (!businessId || !orgHandle) notFound();

  const business = await fetchPublicBusiness(orgHandle, businessId);
  if (!business) notFound();

  const path = businessPublicPath(business.id, business.name);
  const listedBy =
    business.listedByOrganizationHandle &&
    business.listedByOrganizationHandle !== orgHandle
      ? business.listedByOrganizationName || business.listedByOrganizationHandle
      : null;

  const jsonLd = buildBusinessJsonLd({
    orgName: orgHandle,
    origin,
    path,
    business,
  });

  const location = [business.city, business.country].filter(Boolean).join(', ');
  const mapQuery = [business.address, business.city, business.country]
    .filter((part) => !!part && String(part).trim() !== '')
    .join(', ');
  const mapsHref = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : null;
  const memberSinceYear = business.createdAt ? new Date(business.createdAt).getFullYear() : null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-6">
        <Link href="/directory" className="text-sm text-emerald-700 hover:underline">
          ← Business directory
        </Link>
      </div>

      <article className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-stone-900">{business.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CategoryPill category={business.category} />
            {memberSinceYear && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.35 4.76 5.25.77-3.8 3.7.9 5.23L12 15l-4.7 2.46.9-5.23-3.8-3.7 5.25-.77L12 3z" />
                </svg>
                Member since {memberSinceYear}
              </span>
            )}
          </div>
          {listedBy && (
            <p className="text-sm text-stone-500 mt-2">Listed by {listedBy}</p>
          )}
        </header>

        {business.logoUrl && (
          <div className="w-28 h-28 rounded-2xl overflow-hidden border border-stone-200 bg-stone-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {business.images && business.images.length > 0 && (
          <section className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-3">Photos</h2>
            {/* Thumbnails in the grid; the full-size variant opens on click. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {business.images.map((image) => (
                <a
                  key={image.id}
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-4/3 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 hover:border-emerald-300"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.thumbUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        {business.description && (
          <section className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-2">About</h2>
            <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">{business.description}</p>
          </section>
        )}

        {(business.email || business.phone || location || business.address) && (
          <section className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-3">Contact</h2>
            <ul className="space-y-2 text-sm text-stone-700">
              {business.email && (
                <li>
                  <a className="inline-flex items-center gap-2 text-emerald-800 hover:underline" href={`mailto:${business.email}`}>
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="break-all">{business.email}</span>
                  </a>
                </li>
              )}
              {business.phone && (
                <li>
                  <a className="inline-flex items-center gap-2 text-emerald-800 hover:underline" href={phoneHref(business.phone)}>
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{formatPhoneNumber(business.phone)}</span>
                  </a>
                </li>
              )}
              {(business.address || location) && (
                <li className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {business.address && <span className="block">{business.address}</span>}
                    {location && <span className="block">{location}</span>}
                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-800 hover:underline"
                      >
                        Open in maps
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
                        </svg>
                      </a>
                    )}
                  </span>
                </li>
              )}
            </ul>
          </section>
        )}

        <section className="bg-white border border-stone-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-3">Online</h2>
          <BusinessSocialLinks business={business} />
        </section>
      </article>
    </div>
  );
}

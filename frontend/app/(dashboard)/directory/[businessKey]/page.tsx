import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BusinessSocialLinks from '@/components/BusinessSocialLinks';
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
          {listedBy && (
            <p className="text-sm text-stone-500 mt-2">Listed by {listedBy}</p>
          )}
          {business.category && (
            <p className="text-sm text-emerald-800 mt-2">{business.category}</p>
          )}
        </header>

        {business.logoUrl && (
          <div className="w-28 h-28 rounded-2xl overflow-hidden border border-stone-200 bg-stone-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {business.description && (
          <section className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-2">About</h2>
            <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">{business.description}</p>
          </section>
        )}

        {(business.email || business.phone || location) && (
          <section className="bg-white border border-stone-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-3">Contact</h2>
            <ul className="space-y-2 text-sm text-stone-700">
              {business.email && (
                <li>
                  <a className="text-emerald-800 hover:underline" href={`mailto:${business.email}`}>
                    {business.email}
                  </a>
                </li>
              )}
              {business.phone && (
                <li>
                  <a className="text-emerald-800 hover:underline" href={`tel:${business.phone}`}>
                    {business.phone}
                  </a>
                </li>
              )}
              {location && <li>{location}</li>}
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

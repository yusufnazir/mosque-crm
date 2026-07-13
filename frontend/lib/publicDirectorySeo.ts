import type { Metadata } from 'next';
import type { PublicBusinessDirectoryResponse, PublicBusinessDTO } from '@/lib/businessDirectoryApi';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8200/api';

export type PublicSitemapEntry = {
  id: number;
  name: string;
  updatedAt?: string;
};

export function extractOrgHandleFromHost(hostHeader: string | null): string {
  if (!hostHeader) return '';
  const host = hostHeader.split(':')[0].trim().toLowerCase();
  if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return '';
  const parts = host.split('.').filter(Boolean);
  if (parts.length < 2) return '';
  const sub = parts[0];
  if (['www', 'auth', 'admin', 'api', 'app', 'mail', 'login'].includes(sub)) return '';
  return sub;
}

export function absoluteOrigin(hostHeader: string | null, protocolHeader: string | null): string {
  const host = (hostHeader || 'localhost').split(',')[0].trim();
  const protocol = (protocolHeader || 'http').split(',')[0].trim().replace(':', '') || 'http';
  return `${protocol}://${host}`;
}

export function slugifyBusinessName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'business';
}

export function businessPublicPath(id: number, name: string): string {
  return `/directory/${id}-${slugifyBusinessName(name)}`;
}

export function parseBusinessKey(key: string): number | null {
  const match = key.match(/^(\d+)/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

export async function fetchPublicDirectory(
  orgHandle: string,
  params: { page?: number; size?: number; search?: string; category?: string } = {}
): Promise<PublicBusinessDirectoryResponse | null> {
  if (!orgHandle) return null;
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page ?? 0));
  searchParams.set('size', String(params.size ?? 48));
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.category?.trim()) searchParams.set('category', params.category.trim());
  try {
    const res = await fetch(
      `${BACKEND_URL}/business-directory/public/${encodeURIComponent(orgHandle)}?${searchParams}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchPublicBusiness(
  orgHandle: string,
  businessId: number
): Promise<PublicBusinessDTO | null> {
  if (!orgHandle || !businessId) return null;
  try {
    const res = await fetch(
      `${BACKEND_URL}/business-directory/public/${encodeURIComponent(orgHandle)}/${businessId}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchPublicSitemapEntries(
  orgHandle: string
): Promise<PublicSitemapEntry[]> {
  if (!orgHandle) return [];
  try {
    const res = await fetch(
      `${BACKEND_URL}/business-directory/public/${encodeURIComponent(orgHandle)}/sitemap-entries`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function directoryListMetadata(args: {
  orgHandle: string;
  orgName: string;
  enabled: boolean;
  includesFederation: boolean;
  origin: string;
  listingCount?: number;
}): Metadata {
  const { orgName, enabled, includesFederation, origin, listingCount } = args;
  const title = `${orgName} Business Directory`;
  const description = includesFederation
    ? `Browse businesses from ${orgName} and its partner organizations.`
    : `Browse businesses registered with ${orgName}.`;
  const countBit =
    typeof listingCount === 'number' && listingCount > 0
      ? ` ${listingCount} listing${listingCount === 1 ? '' : 's'} available.`
      : '';
  const canonical = `${origin}/directory`;
  if (!enabled) {
    return {
      title,
      description: description + countBit,
      robots: { index: false, follow: false },
    };
  }
  return {
    title,
    description: description + countBit,
    alternates: { canonical },
    openGraph: {
      title,
      description: description + countBit,
      url: canonical,
      type: 'website',
      siteName: orgName,
    },
    twitter: {
      card: 'summary',
      title,
      description: description + countBit,
    },
    robots: { index: true, follow: true },
  };
}

export function directoryDetailMetadata(args: {
  orgName: string;
  business: PublicBusinessDTO;
  origin: string;
  path: string;
}): Metadata {
  const { orgName, business, origin, path } = args;
  const title = `${business.name} | ${orgName} Business Directory`;
  const description =
    (business.description && business.description.trim()) ||
    `${business.name}${business.city ? ` in ${business.city}` : ''}${
      business.category ? ` · ${business.category}` : ''
    } — listed on ${orgName}.`;
  const canonical = `${origin}${path}`;
  const image = business.logoUrl
    ? business.logoUrl.startsWith('http')
      ? business.logoUrl
      : `${origin}${business.logoUrl}`
    : undefined;
  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical },
    openGraph: {
      title,
      description: description.slice(0, 300),
      url: canonical,
      type: 'website',
      siteName: orgName,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description: description.slice(0, 300),
      images: image ? [image] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export function buildDirectoryListJsonLd(args: {
  orgName: string;
  origin: string;
  businesses: PublicBusinessDTO[];
}): Record<string, unknown> {
  const { orgName, origin, businesses } = args;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${orgName} Business Directory`,
    url: `${origin}/directory`,
    isPartOf: {
      '@type': 'Organization',
      name: orgName,
      url: origin,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: businesses.length,
      itemListElement: businesses.map((b, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${origin}${businessPublicPath(b.id, b.name)}`,
        name: b.name,
      })),
    },
  };
}

export function buildBusinessJsonLd(args: {
  orgName: string;
  origin: string;
  path: string;
  business: PublicBusinessDTO;
}): Record<string, unknown> {
  const { orgName, origin, path, business } = args;
  const sameAs = [
    business.website,
    business.facebookUrl,
    business.instagramUrl,
    business.tiktokUrl,
    business.youtubeUrl,
    business.linkedinUrl,
  ].filter((v): v is string => !!v && v.trim().length > 0);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description || undefined,
    url: `${origin}${path}`,
    email: business.email || undefined,
    telephone: business.phone || undefined,
    image: business.logoUrl
      ? business.logoUrl.startsWith('http')
        ? business.logoUrl
        : `${origin}${business.logoUrl}`
      : undefined,
    address:
      business.city || business.country
        ? {
            '@type': 'PostalAddress',
            addressLocality: business.city || undefined,
            addressCountry: business.country || undefined,
          }
        : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };

  if (business.listedByOrganizationName) {
    jsonLd.parentOrganization = {
      '@type': 'Organization',
      name: business.listedByOrganizationName,
    };
  } else {
    jsonLd.parentOrganization = {
      '@type': 'Organization',
      name: orgName,
      url: origin,
    };
  }

  return jsonLd;
}

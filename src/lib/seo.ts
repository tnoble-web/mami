/**
 * Structured data and metadata builders.
 *
 * Two jobs here:
 *
 *  1. Metadata (<title>, description, canonical, Open Graph) so the page can
 *     rank and so shared links look right.
 *  2. JSON-LD, which is how you tell Google what the page IS rather than
 *     making it guess. The FAQPage block is the highest-leverage part — it is
 *     what gets you into the "People also ask" box for questions like
 *     "where do photos happen if it rains at <venue>", which is exactly what
 *     a couple who has booked that venue types.
 *
 * Everything is emitted from real content. Nothing here fabricates a claim:
 * if a venue has no FAQs, no FAQPage block is produced.
 */

import type { Metadata } from 'next';
import { business } from '@config/business';
import type { Venue } from '@content/venues/types';
import { venuePath } from './venues';

const SITE = business.siteUrl.replace(/\/$/, '');

export function absoluteUrl(path: string): string {
  return `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Social profile URLs, used as `sameAs` to link the site to your other profiles. */
function sameAs(): string[] {
  return [business.instagram, business.facebook, business.googleBusinessProfile].filter(
    (v): v is string => Boolean(v),
  );
}

/**
 * The studio itself. Emitted site-wide from the root layout.
 *
 * `@id` is a stable identifier the venue pages point back at, so Google
 * understands every venue page belongs to one business rather than treating
 * them as unrelated pages.
 */
export function studioJsonLd() {
  const node: Record<string, unknown> = {
    '@type': 'ProfessionalService',
    '@id': `${SITE}/#studio`,
    name: business.name,
    url: SITE,
    areaServed: {
      '@type': 'City',
      name: business.region,
    },
    address: {
      '@type': 'PostalAddress',
      addressRegion: business.regionCode,
      addressCountry: business.country,
    },
  };

  if (business.phone) node.telephone = business.phone;
  if (business.replyToEmail && !business.replyToEmail.startsWith('TODO')) {
    node.email = business.replyToEmail;
  }
  const profiles = sameAs();
  if (profiles.length) node.sameAs = profiles;

  return node;
}

export function venueMetadata(venue: Venue): Metadata {
  const url = absoluteUrl(venuePath(venue));
  const images = venue.heroImage
    ? [{ url: absoluteUrl(venue.heroImage.src), alt: venue.heroImage.alt }]
    : [];

  return {
    title: venue.title,
    description: venue.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: venue.title,
      description: venue.metaDescription,
      url,
      siteName: business.shortName,
      type: 'article',
      locale: 'en_CA',
      images,
    },
    // Drafts must never be indexed, even if someone finds the URL.
    robots: venue.published ? undefined : { index: false, follow: false },
  };
}

/**
 * The JSON-LD graph for a venue page: the page itself, the venue as a Place,
 * breadcrumbs, and the FAQ block.
 */
export function venueJsonLd(venue: Venue) {
  const url = absoluteUrl(venuePath(venue));

  const place: Record<string, unknown> = {
    '@type': 'Place',
    '@id': `${url}#place`,
    name: venue.name,
    address: {
      '@type': 'PostalAddress',
      ...(venue.address.street ? { streetAddress: venue.address.street } : {}),
      addressLocality: venue.address.city,
      addressRegion: venue.address.region,
      ...(venue.address.postalCode ? { postalCode: venue.address.postalCode } : {}),
      addressCountry: venue.address.country,
    },
  };
  if (venue.geo) {
    place.geo = { '@type': 'GeoCoordinates', latitude: venue.geo.lat, longitude: venue.geo.lng };
  }
  if (venue.venueWebsite) place.url = venue.venueWebsite;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': url,
      url,
      name: venue.title,
      description: venue.metaDescription,
      about: { '@id': `${url}#place` },
      provider: { '@id': `${SITE}/#studio` },
      isPartOf: { '@id': `${SITE}/#website` },
    },
    place,
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Wedding venues',
          item: absoluteUrl('/wedding-photographer'),
        },
        { '@type': 'ListItem', position: 3, name: venue.name, item: url },
      ],
    },
  ];

  // Only claim an image gallery if there are actually images.
  if (venue.gallery.length > 0) {
    graph.push({
      '@type': 'ImageGallery',
      '@id': `${url}#gallery`,
      name: `Wedding photographs at ${venue.name}`,
      associatedMedia: venue.gallery.map((img) => ({
        '@type': 'ImageObject',
        contentUrl: absoluteUrl(img.src),
        caption: img.caption ?? img.alt,
        width: img.width,
        height: img.height,
      })),
    });
  }

  if (venue.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: venue.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: SITE,
        name: business.name,
        publisher: { '@id': `${SITE}/#studio` },
      },
      studioJsonLd(),
    ],
  };
}

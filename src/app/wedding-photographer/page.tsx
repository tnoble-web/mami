import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { business } from '@config/business';
import { getPublishedVenues, venuePath } from '@/lib/venues';
import { absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: `${business.region} Wedding Venues I Photograph | ${business.shortName}`,
  description: `The ${business.region}-area wedding venues I have photographed, with the light, the rain plan and the timeline notes for each one.`,
  alternates: { canonical: absoluteUrl('/wedding-photographer') },
};

/**
 * The hub page.
 *
 * Two jobs: it is a useful page in its own right, and it is the internal link
 * hub that spreads ranking strength to every venue page. Each venue page links
 * back here and to two or three siblings, which is how a small site gets its
 * long-tail pages crawled and ranked.
 */
export default function VenueIndexPage() {
  const venues = getPublishedVenues();

  return (
    <div className="wrap">
      <header className="venue-head">
        <h1>{business.region} wedding venues I photograph</h1>
        <div className="measure">
          <p>
            Every venue below is one I have actually worked at — so these are not brochure
            descriptions. Each page has the timing that gets the best light on that specific
            property, where portraits work when it rains, and the house rules worth knowing
            before you plan the day.
          </p>
          <p>
            Getting married somewhere that is not listed?{' '}
            <Link href="/inquire">Tell me where</Link> — I photograph across the{' '}
            {business.region} area and beyond.
          </p>
        </div>
      </header>

      {venues.length === 0 ? (
        <div className="empty-state">
          <p>
            <strong>No published venue pages yet.</strong>
          </p>
          <p>
            Create one with <code>npm run new:venue</code>, fill in the real content, then set{' '}
            <code>published: true</code> in its file. Check your drafts against the worked
            example in <code>content/venues/_example-maplewood-barn.ts</code> before you publish.
          </p>
          <p style={{ marginBottom: 0 }}>
            Run <code>npm run check:venues</code> to catch placeholder text and thin content
            first.
          </p>
        </div>
      ) : (
        <ul className="venue-grid">
          {venues.map((venue) => (
            <li className="venue-card" key={venue.slug}>
              <Link href={venuePath(venue)}>
                <div className="venue-card__thumb">
                  {venue.heroImage && (
                    <Image
                      src={venue.heroImage.src}
                      alt={venue.heroImage.alt}
                      width={venue.heroImage.width}
                      height={venue.heroImage.height}
                      sizes="(max-width: 700px) 100vw, 33vw"
                    />
                  )}
                </div>
                <h2>{venue.name}</h2>
                <p>
                  {venue.address.city}, {venue.address.region}
                  {venue.shotCount ? ` · ${venue.shotCount} weddings` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

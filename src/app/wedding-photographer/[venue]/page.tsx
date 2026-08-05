import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { business } from '@config/business';
import { getRoutableVenues, getVenueBySlug, getRelatedVenues, venuePath } from '@/lib/venues';
import { venueJsonLd, venueMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { InquiryForm } from '@/components/InquiryForm';

type Params = { params: Promise<{ venue: string }> };

export function generateStaticParams() {
  return getRoutableVenues().map((v) => ({ venue: v.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { venue: slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) return {};
  return venueMetadata(venue);
}

export default async function VenuePage({ params }: Params) {
  const { venue: slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) notFound();

  const related = getRelatedVenues(venue);
  const hasSpots = (venue.ceremonySpots?.length ?? 0) + (venue.portraitSpots?.length ?? 0) > 0;

  // Only shown for drafts, and drafts only route in development.
  const isDraft = !venue.published;

  return (
    <>
      <JsonLd data={venueJsonLd(venue)} />

      {isDraft && (
        <div className="draft-banner">
          <strong>Draft.</strong> This page is <code>published: false</code>, so it is excluded
          from the sitemap, the venue index and search engines. Set it to <code>true</code> in{' '}
          <code>content/venues/{venue.slug}.ts</code> when the content is finished.
        </div>
      )}

      <article>
        {venue.heroImage ? (
          <figure className="venue-hero">
            <Image
              src={venue.heroImage.src}
              alt={venue.heroImage.alt}
              width={venue.heroImage.width}
              height={venue.heroImage.height}
              priority
              sizes="100vw"
            />
          </figure>
        ) : (
          <div className="venue-hero__placeholder">
            No hero image yet — add one in <code>content/venues/{venue.slug}.ts</code>. A page
            about photography needs photographs to convert.
          </div>
        )}

        <div className="wrap">
          <header className="venue-head">
            <p className="venue-head__eyebrow">
              {venue.address.city}, {venue.address.region}
            </p>

            {/* The H1 carries the exact phrase a couple who booked this venue searches. */}
            <h1>{venue.name} Wedding Photographer</h1>

            {/* credentialLine wins when set — a relationship with the venue
                persuades a couple far more than a wedding count does. */}
            {venue.credentialLine ? (
              <p className="venue-head__cred">{venue.credentialLine}</p>
            ) : (
              (venue.shotCount || venue.firstShotYear) && (
                <p className="venue-head__cred">
                  {venue.shotCount
                    ? `${venue.shotCount} ${venue.shotCount === 1 ? 'wedding' : 'weddings'} photographed at ${venue.name}`
                    : `I have photographed weddings at ${venue.name}`}
                  {venue.firstShotYear ? ` since ${venue.firstShotYear}.` : '.'}
                </p>
              )
            )}

            <div className="measure">
              {venue.intro.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </header>

          {venue.gallery.length > 0 && (
            <section className="venue-section" aria-labelledby="gallery-heading">
              <h2 id="gallery-heading">Weddings I have photographed here</h2>
              <div className="gallery">
                {venue.gallery.map((img) => (
                  <figure key={img.src}>
                    <Image
                      src={img.src}
                      alt={img.alt}
                      width={img.width}
                      height={img.height}
                      sizes="(max-width: 700px) 100vw, 33vw"
                    />
                    {img.caption && <figcaption>{img.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {venue.lightNotes && (
            <section className="venue-section venue-section--ruled">
              <h2>The light at {venue.name}</h2>
              <p className="measure">{venue.lightNotes}</p>
            </section>
          )}

          {hasSpots && (
            <section className="venue-section venue-section--ruled">
              <h2>Where things work on this property</h2>

              {venue.ceremonySpots && venue.ceremonySpots.length > 0 && (
                <>
                  <h3>Ceremony</h3>
                  <ul className="spot-list measure">
                    {venue.ceremonySpots.map((spot) => (
                      <li key={spot.name}>
                        <p className="spot-list__name">{spot.name}</p>
                        <p className="spot-list__note">{spot.note}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {venue.portraitSpots && venue.portraitSpots.length > 0 && (
                <>
                  <h3 style={{ marginTop: '2rem' }}>Portraits</h3>
                  <ul className="spot-list measure">
                    {venue.portraitSpots.map((spot) => (
                      <li key={spot.name}>
                        <p className="spot-list__name">{spot.name}</p>
                        <p className="spot-list__note">{spot.note}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {venue.rainPlan && (
            <section className="venue-section venue-section--ruled">
              <h2>If it rains</h2>
              <p className="measure">{venue.rainPlan}</p>
            </section>
          )}

          {venue.gettingReady && (
            <section className="venue-section venue-section--ruled">
              <h2>Getting ready</h2>
              <p className="measure">{venue.gettingReady}</p>
            </section>
          )}

          {venue.timelineTips && venue.timelineTips.length > 0 && (
            <section className="venue-section venue-section--ruled">
              <h2>Timeline notes for {venue.name}</h2>
              <ul className="tip-list measure">
                {venue.timelineTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </section>
          )}

          {venue.restrictions && (
            <section className="venue-section venue-section--ruled">
              <h2>House rules worth knowing</h2>
              <p className="measure">{venue.restrictions}</p>
            </section>
          )}

          {venue.faqs.length > 0 && (
            <section className="venue-section venue-section--ruled" aria-labelledby="faq-heading">
              <h2 id="faq-heading">Questions couples ask about {venue.name}</h2>
              <div className="faq">
                {venue.faqs.map((faq) => (
                  <details key={faq.q}>
                    <summary>{faq.q}</summary>
                    <div>{faq.a}</div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {venue.vendors && venue.vendors.length > 0 && (
            <section className="venue-section venue-section--ruled">
              <h2>Vendors I have worked with here</h2>
              <dl className="vendor-list">
                {venue.vendors.map((vendor) => (
                  <div key={`${vendor.role}-${vendor.name}`}>
                    <dt>{vendor.role}</dt>
                    <dd style={{ margin: 0 }}>
                      {vendor.website ? (
                        <a href={vendor.website} rel="noopener">
                          {vendor.name}
                        </a>
                      ) : (
                        vendor.name
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="cta" aria-labelledby="cta-heading">
            <h2 id="cta-heading">Getting married at {venue.name}?</h2>
            <p className="cta__lede">
              Tell me your date and I will come back to you within{' '}
              {business.humanReplyWithinHours} hours with whether it is open.
              {venue.venueWebsite ? '' : ''}
            </p>
            <InquiryForm venueName={venue.name} source="venue-page" />
          </section>

          {related.length > 0 && (
            <section className="venue-section venue-section--ruled">
              <h2>Other venues I photograph</h2>
              <ul className="related">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={venuePath(r)}>{r.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>
    </>
  );
}

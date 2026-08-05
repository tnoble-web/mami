import { allVenues } from '@content/venues';
import type { Venue } from '@content/venues/types';

export type { Venue };

const isDev = process.env.NODE_ENV !== 'production';

/** Everything registered, published or not. */
export function getAllVenues(): Venue[] {
  return allVenues;
}

/**
 * Venues that are live: they appear in the sitemap, the venue index and
 * internal links. Unpublished drafts are deliberately excluded — a thin page
 * in the sitemap teaches Google that your venue URLs are low quality, which
 * is the opposite of the point.
 */
export function getPublishedVenues(): Venue[] {
  return allVenues
    .filter((v) => v.published)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Which venues get a route built. In development, drafts are reachable by
 * URL so you can preview as you write. In production, only published ones
 * exist at all.
 */
export function getRoutableVenues(): Venue[] {
  return isDev ? allVenues : getPublishedVenues();
}

export function getVenueBySlug(slug: string): Venue | null {
  return getRoutableVenues().find((v) => v.slug === slug) ?? null;
}

/**
 * Resolve free text from an inquiry form to one of your venues.
 *
 * Couples type "stanleys", "Stanley's farm", "olde maple lane" — all the same
 * place. Matching them back to a page lets the auto-reply mention the venue
 * specifically, which is what makes it read like a human wrote it.
 */
export function matchVenueByText(text: string | null | undefined): Venue | null {
  if (!text) return null;
  const needle = normalise(text);
  if (!needle) return null;

  for (const venue of getAllVenues()) {
    const candidates = [venue.name, venue.slug, ...venue.aliases].map(normalise);
    if (candidates.some((c) => c && (needle === c || needle.includes(c) || c.includes(needle)))) {
      return venue;
    }
  }
  return null;
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Resolves relatedVenueSlugs to venues, skipping any that are not live. */
export function getRelatedVenues(venue: Venue): Venue[] {
  const slugs = venue.relatedVenueSlugs ?? [];
  return slugs
    .map((slug) => getPublishedVenues().find((v) => v.slug === slug))
    .filter((v): v is Venue => Boolean(v));
}

export function venuePath(venue: Pick<Venue, 'slug'>): string {
  return `/wedding-photographer/${venue.slug}`;
}

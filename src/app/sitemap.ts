import type { MetadataRoute } from 'next';
import { getPublishedVenues, venuePath } from '@/lib/venues';
import { absoluteUrl } from '@/lib/seo';

/**
 * Only PUBLISHED venues go in here.
 *
 * Submitting thin or half-written pages teaches Google that your venue URLs
 * are low quality, and that judgement is slow to reverse. An unfinished page
 * left out of the sitemap costs you nothing; one left in costs you the
 * credibility of every other venue page.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const venues = getPublishedVenues();

  return [
    {
      url: absoluteUrl('/wedding-photographer'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...venues.map((venue) => ({
      url: absoluteUrl(venuePath(venue)),
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    })),
  ];
}

import type { Venue } from './types';

/**
 * OrchardView — Greely, ON.
 *
 * THE ANGLE FOR THIS PAGE: you were OrchardView's all-inclusive in-house
 * photographer through 2021. Nobody else competing for this search term can
 * say that, and it should be the first thing the page says. A couple who has
 * already booked OrchardView, reading "I was their in-house photographer for
 * a year", has essentially finished shopping.
 *
 * It also means the logistics fields below should end up the strongest on the
 * whole site. A year of weddings on one property is knowledge no competitor
 * can manufacture.
 *
 * Name is spelled OrchardView, one word, per the venue's own branding and
 * their orchardview.ca domain. The aliases carry the two-word spelling so
 * couples who type "orchard view" still land here.
 */
const venue: Venue = {
  slug: 'orchardview',
  name: 'OrchardView',
  aliases: [
    'orchardview',
    'orchard view',
    'orchardview greely',
    'orchard view greely',
    'orchardview wedding and event centre',
    'orchard view wedding & event centre',
    'orchardview weddings',
  ],

  address: {
    street: '6346 Deermeadow Drive',
    city: 'Greely',
    region: 'ON',
    postalCode: 'K4P 1M9',
    country: 'CA',
  },

  geo: null,
  venueWebsite: 'https://www.orchardview.ca',

  title: 'OrchardView Wedding Photographer | No Greater Love',

  // TODO: ~155 chars. Lead with the in-house year — it is the whole hook.
  metaDescription: 'TODO',

  // TODO: two or three paragraphs. Paragraph one opens with the in-house
  // year, because it is the most persuasive sentence available to you.
  intro: ['TODO'],

  shotCount: null, // TODO: roughly how many weddings across the in-house year
  firstShotYear: 2021,

  lightNotes: null, // TODO
  ceremonySpots: [], // TODO
  portraitSpots: [], // TODO
  rainPlan: null, // TODO
  gettingReady: null, // TODO
  timelineTips: [], // TODO
  restrictions: null, // TODO

  heroImage: null, // TODO
  gallery: [], // TODO

  faqs: [], // TODO

  // TODO: an in-house year means you worked alongside the same vendors over
  // and over. Crediting and linking them gives them a reason to share the
  // page, and those are exactly the referral relationships worth feeding.
  vendors: [],

  relatedVenueSlugs: ['bean-town-ranch', 'le-belvedere'],

  published: false,
};

export default venue;

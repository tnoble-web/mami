import type { Venue } from './types';

/**
 * TO FINISH THIS PAGE, fill in every field marked TODO and set
 * `published: true`. Run `npm run check:venues` to see what is missing.
 *
 * Address and website below are verified. Note the venue spells itself
 * "Orchard View" as two words — worth matching them rather than the domain.
 */
const venue: Venue = {
  slug: 'orchard-view',
  name: 'Orchard View Wedding & Event Centre',
  aliases: [
    'orchard view',
    'orchardview',
    'orchard view greely',
    'orchardview greely',
    'orchard view wedding and event centre',
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

  title: 'Orchard View Wedding Photographer | No Greater Love',

  // TODO: ~155 characters, mentioning that you have actually shot here.
  metaDescription: 'TODO',

  // TODO: two or three paragraphs, first person, specific to this property.
  intro: ['TODO'],

  shotCount: null, // TODO
  firstShotYear: null, // TODO

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

  vendors: [],
  relatedVenueSlugs: ['bean-town-ranch', 'le-belvedere'],

  published: false,
};

export default venue;

import type { Venue } from './types';

/**
 * TO FINISH THIS PAGE, fill in every field marked TODO and set
 * `published: true`. Run `npm run check:venues` to see what is missing.
 *
 * Address verified — note this is PLANTAGENET, about 40 minutes east of
 * Ottawa, not west. Worth double-checking against your own records, since
 * the drive shapes your travel time and the couple's guest logistics.
 */
const venue: Venue = {
  slug: 'bean-town-ranch',
  name: 'Bean Town Ranch',
  aliases: [
    'bean town ranch',
    'beantown ranch',
    'beantown',
    'bean town',
    'bean town ranch plantagenet',
  ],

  address: {
    street: '2891 Concession 3',
    city: 'Plantagenet',
    region: 'ON',
    postalCode: 'K0B 1L0',
    country: 'CA',
  },

  geo: null,
  venueWebsite: null, // TODO: add their site if you want to link out

  title: 'Bean Town Ranch Wedding Photographer | No Greater Love',

  // TODO: ~155 characters, mentioning that you have shot here.
  metaDescription: 'TODO',

  // TODO: two or three paragraphs, first person.
  intro: ['TODO'],

  shotCount: null, // TODO
  firstShotYear: null, // TODO

  // TODO: this is a large open rural property — where the good light is, and
  // when, is the most valuable thing you can tell a couple about it.
  lightNotes: null,

  ceremonySpots: [], // TODO
  portraitSpots: [], // TODO
  rainPlan: null, // TODO

  gettingReady: null, // TODO

  // TODO: worth noting the drive from Ottawa in your timeline advice — an
  // out-of-town venue changes when the day has to start.
  timelineTips: [],

  restrictions: null, // TODO

  heroImage: null, // TODO
  gallery: [], // TODO

  faqs: [], // TODO

  vendors: [],
  relatedVenueSlugs: ['orchard-view', 'le-belvedere'],

  published: false,
};

export default venue;

import type { Venue } from './types';

/**
 * TO FINISH THIS PAGE, fill in every field marked TODO and set
 * `published: true`. Run `npm run check:venues` to see what is missing.
 *
 * Address and website verified.
 *
 * A note on competition: this is the most-photographed wedding venue in
 * Ottawa, so this page has more competitors than your rural ones. It is
 * still worth writing — but expect Le Belvédère, Orchard View and Bean Town
 * Ranch to rank faster, and do those first.
 */
const venue: Venue = {
  slug: 'fairmont-chateau-laurier',
  name: 'Fairmont Château Laurier',
  aliases: [
    'chateau laurier',
    'château laurier',
    'fairmont chateau laurier',
    'the chateau',
    'chateau',
    'fairmont ottawa',
  ],

  address: {
    street: '1 Rideau Street',
    city: 'Ottawa',
    region: 'ON',
    postalCode: 'K1N 8S7',
    country: 'CA',
  },

  geo: null,
  venueWebsite: 'https://www.chateaulaurier.com',

  title: 'Château Laurier Wedding Photographer | No Greater Love',

  // TODO: ~155 characters. Everyone claims this venue — earn the click with
  // something specific rather than "timeless elegance".
  metaDescription: 'TODO',

  // TODO: two or three paragraphs, first person.
  intro: ['TODO'],

  shotCount: null, // TODO
  firstShotYear: null, // TODO

  lightNotes: null, // TODO

  ceremonySpots: [], // TODO

  // TODO: the surroundings are half the appeal here — the locks, Major's
  // Hill Park, Parliament across the way. Which you actually use, how long
  // each takes, and which need a permit or get mobbed by tourists is exactly
  // the knowledge that makes this page beat the competition.
  portraitSpots: [],

  rainPlan: null, // TODO
  gettingReady: null, // TODO

  // TODO: downtown logistics — where the car goes, how long the walk to the
  // locks really takes in a dress, when the tourist crowds thin out.
  timelineTips: [],

  restrictions: null, // TODO — hotel photography rules, and any NCC permit
  // requirements for the locks or Major's Hill Park

  heroImage: null, // TODO
  gallery: [], // TODO

  faqs: [], // TODO

  vendors: [],
  relatedVenueSlugs: ['sala-san-marco', 'canada-aviation-space-museum'],

  published: false,
};

export default venue;

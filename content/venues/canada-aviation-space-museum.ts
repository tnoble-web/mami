import type { Venue } from './types';

/**
 * TO FINISH THIS PAGE, fill in every field marked TODO and set
 * `published: true`. Run `npm run check:venues` to see what is missing.
 *
 * Address and website verified. The aliases matter more than usual here:
 * couples call this "the aviation museum" far more often than its full
 * name, so both need to match for the page to be findable.
 */
const venue: Venue = {
  slug: 'canada-aviation-space-museum',
  name: 'Canada Aviation and Space Museum',
  aliases: [
    'aviation museum',
    'the aviation museum',
    'canada aviation museum',
    'canada aviation and space museum',
    'aviation and space museum',
    'space museum',
    'rockcliffe aviation museum',
  ],

  address: {
    street: '11 Aviation Parkway',
    city: 'Ottawa',
    region: 'ON',
    postalCode: 'K1K 2X5',
    country: 'CA',
  },

  geo: null,
  venueWebsite: 'https://ingeniumcanada.org/aviation',

  title: 'Aviation Museum Wedding Photographer | No Greater Love',

  // TODO: ~155 characters. The aircraft hangar is a genuinely distinctive
  // backdrop — say something only someone who has shot it would say.
  metaDescription: 'TODO',

  // TODO: two or three paragraphs, first person.
  intro: ['TODO'],

  shotCount: null, // TODO
  firstShotYear: null, // TODO

  // TODO: a hangar is a hard lighting environment — mixed and often dim.
  // How you handle it here is exactly the expertise a couple is looking for.
  lightNotes: null,

  ceremonySpots: [], // TODO
  portraitSpots: [], // TODO

  // TODO: fully indoors, so rain matters less — but say so explicitly,
  // because it is a real selling point for an Ottawa wedding.
  rainPlan: null,

  gettingReady: null, // TODO

  timelineTips: [], // TODO

  // TODO: a national museum will have rules a private venue does not —
  // access windows around public hours, where tripods and flash are allowed,
  // how close you may get to the aircraft. Worth being precise.
  restrictions: null,

  heroImage: null, // TODO
  gallery: [], // TODO

  faqs: [], // TODO

  vendors: [],
  relatedVenueSlugs: ['fairmont-chateau-laurier', 'sala-san-marco'],

  published: false,
};

export default venue;

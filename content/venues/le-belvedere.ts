import type { Venue } from './types';

/**
 * TO FINISH THIS PAGE, fill in every field marked TODO and set
 * `published: true`. Run `npm run check:venues` to see what is still missing.
 *
 * Address and website below are verified. Everything first-hand — the light,
 * the rain plan, the spots — has to come from you. Do not let me guess it:
 * this is a cliffside property in the Gatineau Hills and a wrong claim about
 * it would be obvious to the venue's own coordinators.
 */
const venue: Venue = {
  slug: 'le-belvedere',
  name: 'Le Belvédère',
  aliases: [
    'le belvedere',
    'belvedere',
    'le belvédère',
    'le belvedere wakefield',
    'belvedere wakefield',
  ],

  address: {
    street: '40 Chemin des Sentiers',
    city: 'Wakefield',
    region: 'QC',
    postalCode: 'J0X 3G0',
    country: 'CA',
  },

  geo: null,
  venueWebsite: 'https://lebelvedere.ca',

  title: 'Le Belvédère Wedding Photographer | No Greater Love',

  // TODO: ~155 characters. Mention that you have shot here and give one
  // concrete reason to click. The cliffside view is the obvious hook.
  metaDescription: 'TODO',

  // TODO: two or three paragraphs, first person, specific to this property.
  intro: ['TODO'],

  shotCount: null, // TODO: how many weddings you have photographed here
  firstShotYear: null, // TODO

  // TODO: this is a west-facing cliffside site — the sunset timing here is
  // the single most useful thing you know about it. Be specific by month.
  lightNotes: null,

  ceremonySpots: [], // TODO
  portraitSpots: [], // TODO

  // TODO: an exposed hilltop venue makes wind and rain a real question.
  rainPlan: null,

  gettingReady: null, // TODO
  timelineTips: [], // TODO — sunset time drives everything at this venue
  restrictions: null, // TODO

  heroImage: null, // TODO
  gallery: [], // TODO — six to twelve of your strongest frames from here

  faqs: [], // TODO — four questions, phrased the way a couple asks them

  vendors: [],
  relatedVenueSlugs: ['orchard-view', 'bean-town-ranch'],

  published: false,
};

export default venue;

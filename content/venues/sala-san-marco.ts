import type { Venue } from './types';

/**
 * TO FINISH THIS PAGE, fill in every field marked TODO and set
 * `published: true`. Run `npm run check:venues` to see what is missing.
 *
 * Address and website verified. One portrait spot is already filled in from
 * what you told me — expand it in your own words, since right now it is my
 * paraphrase of your one-liner rather than your actual knowledge of the place.
 */
const venue: Venue = {
  slug: 'sala-san-marco',
  name: 'Sala San Marco',
  aliases: [
    'sala san marco',
    'sala',
    'san marco',
    'sala san marco banquet',
    'sala san marco event centre',
    'sala san marco conference centre',
  ],

  address: {
    street: '215 Preston Street',
    city: 'Ottawa',
    region: 'ON',
    postalCode: 'K1R 7R1',
    country: 'CA',
  },

  geo: null,
  venueWebsite: 'https://salasanmarco.ca',

  title: 'Sala San Marco Wedding Photographer | No Greater Love',

  // TODO: ~155 characters. That the best portraits happen a short drive away
  // at the Ornamental Gardens is a genuinely useful, clickable detail.
  metaDescription: 'TODO',

  // TODO: two or three paragraphs, first person. This is a Little Italy
  // banquet venue, so the honest story is probably that the reception rooms
  // are the event and the portraits happen elsewhere. Say that plainly —
  // couples booking here are already wondering about it.
  intro: ['TODO'],

  shotCount: null, // TODO
  firstShotYear: null, // TODO

  // TODO: interior banquet lighting, and what you do about it.
  lightNotes: null,

  ceremonySpots: [], // TODO

  portraitSpots: [
    {
      name: 'Ornamental Gardens, Central Experimental Farm (off-site)',
      // TODO: replace with your own words. Which part of the gardens, what
      // time of year it is at its best, how long the drive and walk take,
      // and whether you need to plan around other couples being there.
      note: 'TODO — you told me the Ornamental Gardens are great for photos. Say why, and how you fit them into a Sala San Marco day.',
    },
  ],

  // TODO: an indoor venue is largely rain-proof, but if your portrait plan
  // depends on going outside to the gardens, the rain plan is a real question.
  rainPlan: null,

  gettingReady: null, // TODO
  timelineTips: [], // TODO — the drive to and from the gardens shapes the timeline
  restrictions: null, // TODO

  heroImage: null, // TODO
  gallery: [], // TODO

  faqs: [], // TODO

  vendors: [],
  relatedVenueSlugs: ['fairmont-chateau-laurier', 'canada-aviation-space-museum'],

  published: false,
};

export default venue;

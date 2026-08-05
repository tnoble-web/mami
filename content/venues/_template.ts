/**
 * VENUE PAGE TEMPLATE — copy this file, do not edit it in place.
 *
 * Easiest path: run `npm run new:venue` and it will scaffold a copy of this
 * with your answers already filled in.
 *
 * Files starting with an underscore are ignored by the registry, so this
 * template never becomes a live page.
 *
 * Rules that matter:
 *  1. Only make a page for a venue you have ACTUALLY SHOT AT. A page with no
 *     real photos from the property and no first-hand knowledge is a doorway
 *     page — it will not rank, and a set of them can drag down the whole site.
 *  2. Never invent a logistics detail. A coordinator reading a wrong claim
 *     about their own venue is the fastest way to lose a referral source.
 *     Leave a field null instead.
 *  3. Keep `published: false` until it is genuinely finished.
 */

import type { Venue } from './types';

const venue: Venue = {
  slug: 'TODO-venue-slug',
  name: 'TODO Venue Name',
  aliases: [
    // Lowercase spellings couples actually type, including common misspellings.
    // 'todo venue',
  ],

  address: {
    street: null,
    city: 'Ottawa',
    region: 'ON',
    postalCode: null,
    country: 'CA',
  },

  geo: null,
  venueWebsite: null,

  // Under ~60 characters. Pattern: "<Venue> Wedding Photographer | <Studio>"
  title: 'TODO Venue Wedding Photographer | No Greater Love Photography',

  // ~150-160 characters, written to earn a click from a human.
  metaDescription:
    'TODO — say that you have photographed weddings here, and give one concrete reason a couple should read on.',

  // Two or three paragraphs, first person, specific to THIS property.
  intro: [
    'TODO — paragraph one. What is it actually like to photograph a wedding here? Name real rooms, real times of day.',
    'TODO — paragraph two. Something you learned here that you would tell a couple over coffee.',
  ],

  shotCount: null,
  firstShotYear: null,

  // The detail that proves you have stood on this property with a camera.
  lightNotes: null,

  ceremonySpots: [
    // { name: 'TODO', note: 'TODO — one specific, true detail.' },
  ],

  portraitSpots: [
    // { name: 'TODO', note: 'TODO — one specific, true detail.' },
  ],

  // Couples worry about rain more than anything else. Answer it concretely.
  rainPlan: null,

  gettingReady: null,

  timelineTips: [
    // 'TODO — concrete timing advice for this venue.',
  ],

  restrictions: null,

  heroImage: null,

  // Six to twelve strong frames from THIS venue beats thirty average ones.
  gallery: [],

  faqs: [
    // { q: 'TODO — as a couple would ask it.', a: 'TODO — answer plainly.' },
  ],

  vendors: [
    // { role: 'Planner', name: 'TODO', website: null },
  ],

  relatedVenueSlugs: [],

  published: false,
};

export default venue;

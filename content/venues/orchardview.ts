import type { Venue } from './types';

/**
 * OrchardView — Greely, ON.
 *
 * Written from the photographer's own notes. Two rules were applied:
 *
 *  1. Nothing here is copied from orchardview.ca. The venue's marketing copy
 *     (room capacities, "private peninsula", and so on) was deliberately left
 *     out — it would be duplicate content, and it is the one part of a venue
 *     page any competitor could reproduce in five minutes.
 *  2. Every claim traces back to something he actually said. Where a spot
 *     exists but he has not given a first-hand note yet, the note is marked
 *     TODO rather than invented.
 *
 * THE ANGLE: he was OrchardView's in-house photographer for 2021, bundled
 * into their all-inclusive package. That relationship is the lead, not the
 * wedding count — 2021 was a pandemic year and the count is modest, but the
 * relationship is something no competitor for this search term can claim.
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

  // 158 characters.
  metaDescription:
    "I was OrchardView's in-house photographer for 2021 — the golden-hour window by the lake, the powerline to watch near the gazebo, and why rain will not ruin it.",

  intro: [
    "For 2021 I was OrchardView's in-house photographer, bundled into their all-inclusive package — which meant that for a year, every couple who booked that package got me. It was a strange season to be photographing weddings and there were fewer of them than any of us wanted. What it gave me instead of volume was a year of walking the same property in every kind of light, learning where it is generous and where it quietly lets a photographer down.",

    "The light here is lovely through the afternoon, but the photographs couples end up framing come from golden hour — roughly 6 to 7pm in the summer months. That is when the lake starts working for you. Evening reflections on the water are the thing I look for at OrchardView above anything else, and I will ask you to protect fifteen minutes for them. In autumn the tree colour on the property is genuinely magnificent, and winter here is beautiful in a way couples touring in June never expect.",

    "The other thing worth knowing is that OrchardView is a calm venue to get married at. Everyone gets ready upstairs, on site, so there is no convoy across town and no part of your morning that depends on traffic. And it would have to rain from breakfast to midnight to actually cost you your photographs — give me half an hour of dry sky anywhere in the day and we are fine.",
  ],

  shotCount: 5,
  firstShotYear: 2021,

  // Leads instead of the count, which is modest for pandemic-year reasons
  // that have nothing to do with how well he knows the property.
  credentialLine: "OrchardView's in-house photographer for 2021 — bundled into their all-inclusive package.",

  lightNotes:
    'Afternoon light is good across the property, but the frames you will keep come from golden hour — roughly 6 to 7pm through the summer. That is the window worth protecting, and the lake is the reason: evening reflections on the water are the strongest thing OrchardView offers a camera, and they only happen late. Autumn is the other standout, when the tree colour comes in. Winter is quietly excellent and badly underrated.',

  ceremonySpots: [
    {
      name: 'Lakeside Gazebo',
      // TODO: your own one-liner. What is it actually like to shoot a ceremony
      // here — where do you stand, where does the light come from, what do
      // guests not realise until they arrive?
      note: 'TODO — one specific, true detail from having shot a ceremony here.',
    },
    {
      name: 'Terrace Pergola',
      // TODO: same. Only your own observation, not the venue's description.
      note: 'TODO — one specific, true detail from having shot a ceremony here.',
    },
    {
      name: 'Indoors, in the window-framed rooms',
      note: 'The windows are the reason this is not a consolation prize. An indoor ceremony here gives you bright, airy frames rather than the dim hall people brace themselves for, which is why I am relaxed about the forecast at OrchardView.',
    },
  ],

  portraitSpots: [
    {
      name: 'The small gazebo, across the bridge',
      note: 'Lovely spot, and the one place on the property with a trap in it — there are overhead powerlines that walk straight into the frame if the photographer is not watching for them. I know where to stand so they are not in your photographs.',
    },
    {
      name: 'The lake at golden hour',
      note: 'Evening reflections on the water are my favourite thing about this venue and the reason I ask for fifteen minutes around 6 to 7pm in summer. Earlier in the day the lake simply does not do this.',
    },
    {
      name: 'The willow trees',
      note: 'Not on any venue tour — I found them during my year here and keep going back to them.',
    },
    {
      name: 'The covered areas, when the weather turns',
      note: 'There are spots where I can put the trees and the water behind you with no roofline anywhere in the shot. Couples are always surprised afterwards that the photographs do not look like they were taken under cover.',
    },
  ],

  rainPlan:
    'It would have to rain the entire day to genuinely cost you your photographs. If there is a thirty-minute to one-hour break anywhere in the day, we are fine — and there almost always is. If there is not, the indoor ceremony spaces have big windows and give you bright, airy frames, and there are covered spots outside where I can frame you with the trees and the water without the roof ever appearing in the shot. It still looks like you got married outdoors.',

  gettingReady:
    'Both parties get ready upstairs on the second floor — one room for the bride and her party, one for the groom and his. The bridal room has French doors onto a large balcony, which is where I go for light when it is good. A party of six or seven works comfortably with two hair and makeup artists working at a time. What makes the room tight is not people, it is luggage: leave the bags in the car until you actually need them.',

  timelineTips: [
    'Hold fifteen minutes between roughly 6 and 7pm in the summer for portraits by the lake. That window is what the property is worth booking for, and it is the one thing I will ask you to plan around.',
    'Everyone gets ready on site, upstairs, so there is no travel built into your morning — which removes the single most common reason a wedding day starts running late.',
    'If you are marrying in autumn, the tree colour is worth building the day around; sunset comes earlier, so the golden-hour window moves forward accordingly.',
  ],

  // He reports no photography restrictions across his in-house year.
  // TODO: confirm the two couples always ask about — drone policy and the
  // hard music-off time — so this can name them specifically.
  restrictions:
    'In a year of working here I never ran into a restriction that affected the photography — no flash limits in the ceremony spaces and no corners of the property I was kept out of.',

  heroImage: null, // TODO — see the note at the bottom of this file
  gallery: [], // TODO — see the note at the bottom of this file

  faqs: [
    {
      q: 'Will rain ruin our wedding photos at OrchardView?',
      a: 'No. It would have to rain the entire day, without a break, to actually cost you your photographs — and if there is even a thirty-minute dry window anywhere in the day, we are fine. Failing that, the indoor ceremony rooms have big windows and photograph bright and airy, and there are covered spots outside where I can frame you with the trees and the water and no roofline in the shot. In a year of shooting here I never once lost a couple their photographs to weather.',
    },
    {
      q: 'What time should we plan our couple photos?',
      a: 'Roughly 6 to 7pm in the summer months. Afternoon light is good across the property, but golden hour is when the lake starts giving you evening reflections on the water, and those are the strongest photographs OrchardView has to offer. Fifteen minutes in that window is enough. For an autumn wedding, sunset comes earlier, so the whole window moves forward.',
    },
    {
      q: 'Is there somewhere to get ready at OrchardView?',
      a: 'Yes — two rooms upstairs on the second floor, one for each party. The bridal room has French doors onto a large balcony, which is usually where I take the getting-ready photographs when the light is good. A party of six or seven is comfortable with two hair and makeup artists working at once. My one piece of advice is to leave your bags in the car until you need them; it is luggage rather than people that makes the room feel small.',
    },
    {
      q: 'Have you photographed at OrchardView before?',
      a: "I was their in-house photographer for 2021, bundled into OrchardView's all-inclusive package — so for a year, couples who booked that package were booking me. That is where the specifics on this page come from, including the overhead powerlines near the small gazebo that turn up in photographs if nobody is watching for them.",
    },
    {
      q: 'Is OrchardView good for a fall or winter wedding?',
      a: 'Both, and they are underrated. The tree colour on the property in autumn is genuinely magnificent and worth planning the day around. Winter is the one that surprises couples — they tour in June and never picture it, but the property photographs beautifully under snow.',
    },
  ],

  // TODO: an in-house year means the same vendors, over and over. List the
  // ones you would happily recommend and link them. Crediting a florist or a
  // DJ here gives them a reason to share the page, and those are exactly the
  // referral relationships worth feeding.
  vendors: [],

  relatedVenueSlugs: ['bean-town-ranch', 'le-belvedere'],

  /**
   * NOT PUBLISHED YET — photographs are the only thing missing.
   *
   * The writing is done. Add 8-10 frames from your OrchardView weddings to
   * public/venues/orchardview/ and list them in heroImage and gallery above
   * with their real pixel dimensions, then set this to true.
   *
   * One note on where the files live: put the page images on your own domain
   * rather than embedding them from SmugMug. Images hosted here count as your
   * content for image search, and they load faster. Keep SmugMug for the
   * full-gallery link at the end — that is what it is good at.
   *
   * Shot list worth including, based on what you told me: the lake at golden
   * hour with the reflections, the small gazebo across the bridge, the willow
   * trees, the bridal room balcony, one bright indoor ceremony frame, and one
   * autumn frame showing the tree colour.
   */
  published: false,
};

export default venue;

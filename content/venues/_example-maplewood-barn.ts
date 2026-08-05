/**
 * WORKED EXAMPLE — this venue is FICTIONAL and this file never ships.
 *
 * The venue name, the vendors and every detail below are invented. That is
 * deliberate: if I had written a realistic-looking example about a real
 * Ottawa venue, you might reasonably have published it, and you would have
 * been publishing claims about someone's property that neither of us can
 * stand behind.
 *
 * It is here to show the STANDARD to hit — the level of specificity that
 * makes one of these pages rank and convert. Notice that almost every
 * sentence contains something only a person who worked there could know.
 * That is the whole trick. Compare your own drafts against this.
 *
 * The leading underscore keeps it out of the registry. Delete it once you
 * have a couple of real pages written.
 */

import type { Venue } from './types';

const venue: Venue = {
  slug: 'maplewood-barn',
  name: 'Maplewood Barn',
  aliases: ['maplewood', 'maplewood barn', 'the maplewood', 'maplewood farm barn'],

  address: {
    street: '000 Example Road',
    city: 'Ottawa',
    region: 'ON',
    postalCode: 'K0A 0A0',
    country: 'CA',
  },

  geo: { lat: 45.3211, lng: -75.9012 },
  venueWebsite: null,

  title: 'Maplewood Barn Wedding Photographer | No Greater Love',

  metaDescription:
    "I've photographed eight weddings at Maplewood Barn since 2019 — here's how the light moves through the loft, where portraits work when it rains, and a timeline that fits the property.",

  intro: [
    "Maplewood Barn is a west-end property built around one very good hour. The barn itself faces southwest, so between about 6:45 and 7:30 in June the light comes in low through the big sliding door on the west wall and lands right across the dance floor. If you want the photographs everyone remembers from this venue, that half hour is what you plan the day around — I ask couples here to hold it open and step out for fifteen minutes.",
    "The rest of the property is more forgiving than it looks. The tree line along the north fence gives you shade at any hour, which matters in August when a 2pm ceremony in the open field is genuinely hard on everyone. And the gravel lane behind the barn — unglamorous in person — is the best portrait spot on site an hour before sunset, because the barn wall bounces warm light back onto whoever is standing there.",
    "The one thing I tell every couple booking Maplewood: the ceremony field has no cover, and the walk from the barn to it is about four minutes over uneven ground. That shapes the rain plan and it shapes footwear. Both are worth deciding early rather than at 3pm on the day.",
  ],

  shotCount: 8,
  firstShotYear: 2019,

  lightNotes:
    'The barn faces southwest. Best light is 6:45–7:30pm in June and roughly 5:15–5:45pm in late September, coming through the west sliding door. Midday in the open ceremony field is harsh with no shade — the north tree line is the fallback at any hour.',

  ceremonySpots: [
    {
      name: 'The open field, south of the barn',
      note: 'The postcard option and what most couples choose, but there is no shade and no cover. A 2pm August ceremony here is hard on guests; after 4pm it is lovely.',
    },
    {
      name: 'Under the two oaks on the north fence',
      note: 'Shaded all day, which makes it the reliable choice for an early-afternoon ceremony. Seats about 80 comfortably — tighter than the field.',
    },
    {
      name: 'Inside the barn, doors open',
      note: 'The rain plan, and better than it sounds. Doors open on the west wall gives you soft directional light on the couple all afternoon.',
    },
  ],

  portraitSpots: [
    {
      name: 'The gravel lane behind the barn',
      note: 'Best spot on the property in the hour before sunset — the barn wall bounces warm light back at you. Looks like nothing when you walk past it at noon.',
    },
    {
      name: 'The loft',
      note: 'One window, very directional, very quiet. Good for ten minutes of something intimate. Steep stairs, so not workable in a long train without help.',
    },
    {
      name: 'The north tree line',
      note: 'Open shade whenever the sun is high. This is where we go if the timeline slips and we have lost the good evening light.',
    },
  ],

  rainPlan:
    'Ceremony moves inside the barn with the west doors open, which takes the venue team about 30 minutes to flip. Portraits work in the loft and under the barn overhang on the east side. The thing to know: the walk from barn to field is uneven ground, so if rain is likely we decide by about 1pm rather than waiting it out.',

  gettingReady:
    'The farmhouse has two upstairs rooms. The east room has a large window and is where I shoot getting-ready — the west room is bigger but the light is much weaker until late afternoon. Neither is huge, so a party of more than six gets tight.',

  timelineTips: [
    'Hold 6:45–7:30pm in June (5:15–5:45pm in late September) for fifteen minutes of couple portraits — this is the light the venue is worth booking for.',
    'Avoid a ceremony in the open field before 4pm in July or August. No shade, and guests feel it.',
    'Allow a full ten minutes to move guests from barn to ceremony field. It is a four-minute walk over uneven ground and it never goes faster than you plan.',
    'If rain is forecast, make the indoor call by 1pm — the venue flip takes about half an hour.',
  ],

  restrictions:
    'No open flame anywhere in the barn, including candles in the centrepieces — LED only. Drone use needs the venue manager cleared in advance. Music off at 1am by township noise bylaw, so last dance is realistically 12:45.',

  heroImage: null,
  gallery: [],

  faqs: [
    {
      q: 'What time should our ceremony be at Maplewood Barn?',
      a: 'For a June or July wedding, 4:30pm or later keeps the ceremony field out of the harshest sun and puts your portraits close to the best light of the evening. For a late-September date, bring that forward to around 3pm — sunset comes early enough that a 4:30 ceremony leaves you shooting portraits in the dark.',
    },
    {
      q: 'Where do photos happen if it rains?',
      a: 'Inside the barn with the west doors open, in the loft, and under the east overhang. I have shot a full rained-out wedding here and the barn light with the doors open is genuinely good — this is not a venue where rain costs you the photographs.',
    },
    {
      q: 'How much time do you need for portraits here?',
      a: 'Fifteen minutes in the right window is enough for the images most couples end up hanging on a wall, because the gravel lane and the barn wall are both a few steps from the reception. Thirty minutes lets us add the tree line and the loft.',
    },
    {
      q: 'Have you photographed at Maplewood Barn before?',
      a: 'Eight weddings since 2019, across every season the venue is open. That is why the timing advice above is specific rather than general.',
    },
  ],

  vendors: [
    { role: 'Planner', name: 'Example Events Co.', website: null },
    { role: 'Florist', name: 'Example Florals', website: null },
  ],

  relatedVenueSlugs: [],

  // Never ships. This is a teaching file.
  published: false,
};

export default venue;

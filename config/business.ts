/**
 * EVERYTHING YOU NEED TO EDIT LIVES IN THIS FILE (and content/venues/).
 *
 * Placeholders are marked TODO. Search for "TODO" before going live —
 * `npm run check:venues` also fails if any are left.
 */

export const business = {
  // TODO: confirm — taken from your domain, so check the capitalisation and
  // wording match how you actually write it.
  name: 'No Greater Love Photography',

  /** Used as the site-wide brand suffix in <title> tags. Keep it short. */
  shortName: 'No Greater Love Photography',

  // TODO: the photographer's first name. Signs the auto-replies and appears
  // in the first-person copy on venue pages.
  photographerFirstName: 'TODO',

  /** Canonical site origin, no trailing slash. Used for canonical URLs and the sitemap. */
  siteUrl: 'https://nogreaterlovephoto.com',

  // TODO: where couples reach you. Auto-replies set this as Reply-To so
  // answers land in your normal inbox.
  replyToEmail: 'TODO@nogreaterlovephoto.com',

  // TODO: the address auto-replies are SENT FROM. Must be on a domain you
  // have verified with your email provider (see README, "Going live").
  fromEmail: 'TODO@nogreaterlovephoto.com',

  // TODO: where YOU get notified of a new inquiry. Can be the same as above.
  notifyEmail: 'TODO@nogreaterlovephoto.com',

  // TODO: your phone number as you want it displayed, or null to omit it.
  phone: null as string | null,

  // TODO: your consult booking link (Calendly, Cal.com, Google appointment
  // page). Null means the CTA asks them to reply with times instead.
  bookingLink: null as string | null,

  // TODO: link to your pricing guide or packages, or null.
  pricingLink: null as string | null,

  /**
   * How fast you promise a human reply, in hours.
   *
   * Whatever number you put here, keep it. Response speed is the strongest
   * single predictor of whether a wedding inquiry converts, and a promise you
   * miss is worse than one you never made.
   */
  humanReplyWithinHours: 12,

  /** Service area, used in page copy and structured data. */
  region: 'Ottawa',
  regionCode: 'ON',
  country: 'CA',

  // TODO: your social profiles, or null. These feed sameAs in structured
  // data, which helps Google connect the site to your Google Business Profile.
  instagram: null as string | null,
  facebook: null as string | null,
  googleBusinessProfile: null as string | null,
} as const;

/**
 * Dates you are ALREADY BOOKED or unavailable. Format 'YYYY-MM-DD'.
 *
 * The inquiry auto-reply checks this and answers the availability question
 * immediately. An instant honest yes-or-no converts far better than "let me
 * check my calendar" — but only if you keep this current.
 */
export const bookedDates: string[] = [
  // '2027-06-12',
];

/** Peak season months (1 = January). Ottawa's runs roughly May–October. */
export const peakSeasonMonths = [5, 6, 7, 8, 9, 10];

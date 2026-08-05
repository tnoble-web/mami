/**
 * The venue page content model.
 *
 * WHY THIS FILE IS SO OPINIONATED ABOUT SPECIFICS
 *
 * These pages exist to rank for "wedding photographer <venue name>" — a
 * search made by someone who has already booked the venue and put down a
 * deposit. Highest-intent search there is, and barely anyone competes for it.
 *
 * The catch: Google is explicitly hostile to sets of near-identical pages
 * built by swapping a name into a template. That pattern is called a doorway
 * page, and it can sink the whole domain, not just the thin pages. The
 * protection is that each page carries real, first-hand knowledge nobody
 * could write without having worked there.
 *
 * So most fields below ask for something concrete and verifiable. If you
 * cannot fill a field truthfully, leave it null — an omitted section looks
 * fine, an invented one costs you your credibility with the venue
 * coordinators who send referrals. Run `npm run check:venues` before you
 * publish; it fails the build on placeholder text and duplicated prose.
 */

export type VenueAddress = {
  street?: string | null;
  city: string;
  /** Province or state, e.g. 'ON'. */
  region: string;
  postalCode?: string | null;
  /** ISO country code, e.g. 'CA'. */
  country: string;
};

export type VenueImage = {
  /** Path under /public, e.g. '/venues/maplewood/ceremony.jpg'. */
  src: string;
  /**
   * Alt text. Describe what is actually happening in the frame — this is for
   * screen readers first and image search second. Do not keyword-stuff it.
   */
  alt: string;
  caption?: string | null;
  /** Real pixel dimensions. Required so the layout does not jump while loading. */
  width: number;
  height: number;
};

export type NamedSpot = {
  name: string;
  /** One specific, true detail about shooting there. */
  note: string;
};

export type VenueFaq = {
  /** Phrase it the way a couple would actually ask it. */
  q: string;
  a: string;
};

/**
 * Vendors you worked alongside at this venue.
 *
 * This is not decoration. Crediting and linking vendors gives them a reason
 * to link back and share the page, and vendor referrals are the highest-ROI
 * channel in wedding photography. The page doubles as a relationship tool.
 */
export type VenueVendor = {
  /** e.g. 'Planner', 'Florist', 'DJ', 'Hair & Makeup', 'Officiant'. */
  role: string;
  name: string;
  website?: string | null;
};

export type Venue = {
  /** URL segment: /wedding-photographer/<slug>. Lowercase, hyphenated. */
  slug: string;

  /** The venue's own name, spelled the way they spell it. */
  name: string;

  /**
   * Other spellings couples actually type, lowercase. Used to match an
   * inquiry's free-text venue field back to this page, and to catch
   * misspellings in internal search.
   */
  aliases: string[];

  address: VenueAddress;

  /** Decimal degrees. Feeds map/structured data. Null if you have not looked it up. */
  geo?: { lat: number; lng: number } | null;

  /** The venue's own website. Links out, and signals a real place. */
  venueWebsite?: string | null;

  // ---------------------------------------------------------------- SEO

  /**
   * The <title>. Keep it under ~60 characters or Google truncates it.
   * Pattern that works: "<Venue> Wedding Photographer | <Your Studio>"
   */
  title: string;

  /**
   * The search-result snippet, ~150-160 characters. Write it for a human
   * deciding whether to click, not for a crawler. Mentioning that you have
   * actually shot there is the thing that earns the click.
   */
  metaDescription: string;

  // ------------------------------------------------- The unique substance

  /**
   * Two or three paragraphs, first person, about photographing weddings
   * HERE. Specific rooms, specific times of day, specific weather. This is
   * the single most important field on the page: it is what makes it a real
   * page instead of a template instance.
   */
  intro: string[];

  /** How many weddings you have shot here. Null if you would rather not say. */
  shotCount?: number | null;

  /** The year of your first wedding at this venue. */
  firstShotYear?: number | null;

  /**
   * Overrides the credibility line under the H1.
   *
   * By default that line is built from shotCount, which is the right choice
   * when the number is the impressive part. It is the wrong choice when you
   * have something stronger — an in-house or preferred-vendor relationship,
   * for instance, carries far more weight with a couple than any count does.
   * Set this and the count is not shown.
   *
   * Must be true and verifiable. This is the most prominent claim on the page.
   */
  credentialLine?: string | null;

  /** Best light, and exactly when. The detail that proves you have been there. */
  lightNotes?: string | null;

  ceremonySpots?: NamedSpot[];
  portraitSpots?: NamedSpot[];

  /** What you actually do here when it rains. Couples worry about this more than anything. */
  rainPlan?: string | null;

  /** The getting-ready space: where it is, how much light, how much room. */
  gettingReady?: string | null;

  /** Concrete timeline advice for this property. */
  timelineTips?: string[];

  /**
   * House rules that affect photography — flash limits in the chapel, drone
   * policy, no-go areas, hard end times, whether there is a shot-list
   * meeting requirement.
   */
  restrictions?: string | null;

  // ------------------------------------------------------------- Media

  /** The single image at the top of the page. Your strongest frame from here. */
  heroImage?: VenueImage | null;

  /** Your work from this venue. Six to twelve strong frames beats thirty average ones. */
  gallery: VenueImage[];

  // ------------------------------------------------------------ Extras

  /**
   * Questions couples ask about weddings at this venue. Answering them
   * plainly is how you win the "People also ask" box, and it feeds FAQ
   * structured data.
   */
  faqs: VenueFaq[];

  vendors?: VenueVendor[];

  /**
   * Slugs of two or three related venues — similar style, similar area.
   * Internal links spread ranking strength between your pages and keep
   * couples on the site.
   */
  relatedVenueSlugs?: string[];

  /**
   * Pages only go into the sitemap and the venue index when this is true.
   *
   * Leave it false until the content is genuinely finished. A half-written
   * page in the sitemap is worse than no page at all — it teaches Google
   * that your venue URLs are thin.
   */
  published: boolean;
};

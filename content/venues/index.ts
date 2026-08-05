/**
 * The venue registry.
 *
 * Every venue page must be imported and listed here. `npm run new:venue`
 * updates this file for you, so you should rarely need to edit it by hand.
 *
 * Why an explicit list instead of scanning the folder: it is type-checked, it
 * fails loudly at build time if a file is broken, and it makes it obvious at a
 * glance what is live. Files prefixed with `_` are never registered.
 */

import type { Venue } from './types';

// The fictional worked example. It is published: false, so it stays out of
// the sitemap and the venue index — but you can still open it in dev to see
// the standard to aim for. Delete this import once your real pages are up.
import exampleMaplewoodBarn from './_example-maplewood-barn';

// --- Your venues (added by `npm run new:venue`) ---------------------------
// import stanleysOldeMapleLaneFarm from './stanleys-olde-maple-lane-farm';

export const allVenues: Venue[] = [
  exampleMaplewoodBarn,
  // stanleysOldeMapleLaneFarm,
];

export type { Venue } from './types';

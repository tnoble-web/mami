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

// The fictional worked example. published: false, so it stays out of the
// sitemap and the venue index — but you can open it in dev to see the standard
// to aim for. Delete this import once your real pages are written.
import exampleMaplewoodBarn from './_example-maplewood-barn';

// --- Your venues ---------------------------------------------------------
// All six are scaffolded with verified addresses and are published: false
// until you fill in the first-hand content. Run `npm run check:venues` to see
// exactly what each one is still missing.
import beanTownRanch from './bean-town-ranch';
import canadaAviationSpaceMuseum from './canada-aviation-space-museum';
import fairmontChateauLaurier from './fairmont-chateau-laurier';
import leBelvedere from './le-belvedere';
import orchardView from './orchard-view';
import salaSanMarco from './sala-san-marco';

export const allVenues: Venue[] = [
  exampleMaplewoodBarn,
  beanTownRanch,
  canadaAviationSpaceMuseum,
  fairmontChateauLaurier,
  leBelvedere,
  orchardView,
  salaSanMarco,
];

export type { Venue } from './types';

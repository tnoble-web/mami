/**
 * Venue content checker — `npm run check:venues`
 *
 * This is the guard rail on the whole strategy.
 *
 * The risk with a set of venue pages is that they end up as the same page
 * with a name swapped in. Google calls that a doorway page, and it can pull
 * down the ranking of every page on the domain, not just the thin ones. So
 * this does two things:
 *
 *  1. Blocks a page from being published while it still has placeholders or
 *     is too thin to be worth indexing.
 *  2. Compares published pages against each other and flags any sentence that
 *     appears on more than one. Reused prose is the signal that a page is
 *     filler rather than first-hand knowledge.
 *
 * Exit code 1 if any published page has an error, so this can gate a deploy.
 * Drafts are reported but never fail the run — an unfinished page is fine, a
 * published bad one is not.
 */

import { allVenues } from '../content/venues';
import type { Venue } from '../content/venues/types';
import { business } from '../config/business';

type Issue = { level: 'error' | 'warn'; message: string };

const MIN_INTRO_WORDS = 120;
const MIN_FAQS = 3;
const MIN_GALLERY = 4;
const MAX_TITLE = 60;
const META_MIN = 110;
const META_MAX = 165;

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasPlaceholder(value: unknown): boolean {
  return typeof value === 'string' && /\bTODO\b/i.test(value);
}

/** Walks every string in the venue looking for leftover TODO markers. */
function findPlaceholders(value: unknown, path = ''): string[] {
  if (typeof value === 'string') return hasPlaceholder(value) ? [path || '(root)'] : [];
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => findPlaceholders(item, `${path}[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, v]) =>
      findPlaceholders(v, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

function checkVenue(venue: Venue): Issue[] {
  const issues: Issue[] = [];
  // A draft is allowed to be incomplete; publishing is what raises the bar.
  const level: Issue['level'] = venue.published ? 'error' : 'warn';

  for (const path of findPlaceholders(venue)) {
    issues.push({ level, message: `placeholder TODO left in ${path}` });
  }

  if (venue.title.length > MAX_TITLE) {
    issues.push({
      level: 'warn',
      message: `title is ${venue.title.length} chars; Google truncates past ~${MAX_TITLE}`,
    });
  }

  const metaLen = venue.metaDescription.length;
  if (!hasPlaceholder(venue.metaDescription) && (metaLen < META_MIN || metaLen > META_MAX)) {
    issues.push({
      level: 'warn',
      message: `metaDescription is ${metaLen} chars; aim for ${META_MIN}-${META_MAX}`,
    });
  }

  const introWords = venue.intro.filter((p) => !hasPlaceholder(p)).reduce((n, p) => n + words(p), 0);
  if (introWords < MIN_INTRO_WORDS) {
    issues.push({
      level,
      message: `intro is ${introWords} words; needs at least ${MIN_INTRO_WORDS} to be worth indexing`,
    });
  }

  if (venue.faqs.length < MIN_FAQS) {
    issues.push({
      level,
      message: `${venue.faqs.length} FAQs; ${MIN_FAQS}+ needed for the FAQ rich result to be worth it`,
    });
  }

  if (!venue.heroImage) {
    issues.push({ level, message: 'no heroImage — a photography page needs a photograph' });
  }

  if (venue.gallery.length < MIN_GALLERY) {
    issues.push({
      level,
      message: `${venue.gallery.length} gallery images; ${MIN_GALLERY}+ needed to show real work from this venue`,
    });
  }

  for (const img of [venue.heroImage, ...venue.gallery].filter(Boolean)) {
    if (!img!.alt || hasPlaceholder(img!.alt)) {
      issues.push({ level, message: `image ${img!.src} has no usable alt text` });
    }
  }

  // The first-hand fields. These are what separate a real page from a
  // template instance, so publishing without any of them is the exact
  // failure mode this whole checker exists to prevent.
  const firstHand = [
    ['lightNotes', venue.lightNotes],
    ['rainPlan', venue.rainPlan],
    ['gettingReady', venue.gettingReady],
  ] as const;
  const missingFirstHand = firstHand
    .filter(([, v]) => !v || hasPlaceholder(v))
    .map(([k]) => k);
  if (missingFirstHand.length === firstHand.length) {
    issues.push({
      level,
      message: `no first-hand detail at all (${missingFirstHand.join(', ')} all empty) — this reads as a template page`,
    });
  }

  const spots = (venue.ceremonySpots?.length ?? 0) + (venue.portraitSpots?.length ?? 0);
  if (spots === 0) {
    issues.push({ level, message: 'no ceremony or portrait spots listed' });
  }

  for (const slug of venue.relatedVenueSlugs ?? []) {
    if (!allVenues.some((v) => v.slug === slug)) {
      issues.push({ level: 'warn', message: `relatedVenueSlugs points at unknown venue "${slug}"` });
    }
    if (slug === venue.slug) {
      issues.push({ level: 'warn', message: 'relatedVenueSlugs links to itself' });
    }
  }

  return issues;
}

/**
 * Cross-venue duplicate prose detection — the doorway-page guard.
 *
 * Only published pages are compared, because that is all Google sees.
 */
function findDuplicateProse(venues: Venue[]): Map<string, string[]> {
  const seen = new Map<string, Set<string>>();

  for (const venue of venues) {
    const prose = [
      ...venue.intro,
      venue.lightNotes ?? '',
      venue.rainPlan ?? '',
      venue.gettingReady ?? '',
      venue.restrictions ?? '',
      ...(venue.timelineTips ?? []),
      ...venue.faqs.map((f) => f.a),
      ...(venue.ceremonySpots ?? []).map((s) => s.note),
      ...(venue.portraitSpots ?? []).map((s) => s.note),
    ].join(' ');

    for (const sentence of prose.split(/(?<=[.!?])\s+/)) {
      const key = sentence.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      // Short fragments repeat innocently; long ones do not.
      if (key.split(' ').length < 8) continue;
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key)!.add(venue.slug);
    }
  }

  const dupes = new Map<string, string[]>();
  for (const [sentence, slugs] of seen) {
    if (slugs.size > 1) dupes.set(sentence, [...slugs]);
  }
  return dupes;
}

// ---------------------------------------------------------------------- run

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

let errors = 0;
let warnings = 0;

console.log(`\n${BOLD}Venue content check${OFF}`);

// Business config placeholders block everything — they end up in page copy.
const businessTodos = Object.entries(business).filter(([, v]) => hasPlaceholder(v));
if (businessTodos.length > 0) {
  console.log(`\n${RED}config/business.ts${OFF}`);
  for (const [key] of businessTodos) {
    console.log(`  ${RED}error${OFF}  ${key} is still TODO — this appears in page copy and emails`);
    errors++;
  }
}

const published = allVenues.filter((v) => v.published);
const drafts = allVenues.filter((v) => !v.published);

for (const venue of [...published, ...drafts]) {
  const issues = checkVenue(venue);
  const tag = venue.published ? `${GREEN}published${OFF}` : `${DIM}draft${OFF}`;

  if (issues.length === 0) {
    console.log(`\n${BOLD}${venue.name}${OFF} (${tag})\n  ${GREEN}ok${OFF}`);
    continue;
  }

  console.log(`\n${BOLD}${venue.name}${OFF} (${tag})`);
  for (const issue of issues) {
    if (issue.level === 'error') {
      console.log(`  ${RED}error${OFF}  ${issue.message}`);
      errors++;
    } else {
      console.log(`  ${YELLOW}warn ${OFF}  ${issue.message}`);
      warnings++;
    }
  }
}

const dupes = findDuplicateProse(published);
if (dupes.size > 0) {
  console.log(`\n${RED}Duplicated prose across published pages${OFF}`);
  console.log(
    `${DIM}  Reused sentences are what make a set of pages look like doorway pages.${OFF}`,
  );
  for (const [sentence, slugs] of dupes) {
    console.log(`  ${RED}error${OFF}  on ${slugs.join(', ')}: "${sentence.slice(0, 90)}…"`);
    errors++;
  }
}

console.log(
  `\n${BOLD}${published.length}${OFF} published, ${BOLD}${drafts.length}${OFF} draft — ` +
    `${errors ? RED : GREEN}${errors} error(s)${OFF}, ${warnings} warning(s)\n`,
);

if (errors > 0) {
  console.log(`${DIM}Errors on published pages fail this check. Drafts only ever warn.${OFF}\n`);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Fill a database with a month of plausible history so the dashboard can be
 * demoed (or screenshotted) before anyone has actually used it.
 *
 *   FRIDGE_DB=data/demo.db node scripts/seed-demo.js
 *
 * Refuses to touch a database that already has real check-ins unless --force.
 */
import { openDb, seedDrinks, seedSettings, getSetting } from '../src/db.js';
import { dayKey } from '../src/stats.js';

const TZ = process.env.FRIDGE_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const force = process.argv.includes('--force');
const dbPath = process.env.FRIDGE_DB || 'data/demo.db';
const db = openDb(dbPath);
seedDrinks(db);
seedSettings(db);

const houseLimit = Number.parseInt(getSetting(db, 'daily_total_limit', ''), 10);
const HOUSE_LIMIT = Number.isFinite(houseLimit) ? houseLimit : null;

const existing = db.prepare('SELECT COUNT(*) AS n FROM takes').get().n;
if (existing > 0 && !force) {
  console.error(`${dbPath} already has ${existing} check-ins. Re-run with --force to add demo data anyway.`);
  process.exit(1);
}

/** Deterministic PRNG so the demo looks the same every run. */
let seed = 20260805;
function random() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = (arr) => arr[Math.floor(random() * arr.length)];

const PEOPLE = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Radia'];
const addPerson = db.prepare('INSERT OR IGNORE INTO people (name) VALUES (?)');
for (const name of PEOPLE) addPerson.run(name);
const people = db.prepare('SELECT * FROM people').all();
const drinks = db.prepare('SELECT * FROM drinks WHERE active = 1').all();

// Relative appetite per drink, and who leans on what.
const weight = {
  Monster: 5, Perrier: 3.5, BioSteel: 2.5, 'Diet Soda': 4, 'Protein Shake': 1.5,
};
const favourite = {
  Ada: 'Monster', Grace: 'Diet Soda', Linus: 'Monster',
  Margaret: 'Perrier', Alan: 'BioSteel', Radia: 'Perrier',
};

const addTake = db.prepare(
  'INSERT INTO takes (person_id, drink_id, qty, over_limit, created_at) VALUES (?, ?, ?, ?, ?)');
const addRestock = db.prepare(
  `INSERT INTO restocks (drink_id, qty_added, counted_before, expected_before, person_id, note, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`);

const DAYS = 30;
const now = new Date();
let takeCount = 0;

/** Per-person, per-drink, per-local-day tally, for realistic limit behaviour. */
const seenToday = new Map();

for (let back = DAYS; back >= 0; back--) {
  const day = new Date(now.getTime() - back * 86400000);
  const dow = day.getUTCDay();
  const isWeekend = dow === 0 || dow === 6;

  for (const person of people) {
    // Most people are in the office on weekdays only, and not every day.
    if (isWeekend && random() > 0.12) continue;
    if (random() > 0.85) continue;

    const drinksToday = isWeekend ? 1 : 1 + Math.floor(random() * 3);
    for (let i = 0; i < drinksToday; i++) {
      const fav = drinks.find((d) => d.name === favourite[person.name]);
      // Two-thirds of the time people reach for their usual.
      const drink = random() < 0.66 && fav
        ? fav
        : weightedPick(drinks);

      // Demand clusters mid-morning and after lunch, in office-local time.
      const hour = random() < 0.55
        ? 9 + Math.floor(random() * 2)
        : 13 + Math.floor(random() * 3);
      const at = utcForLocal(day, hour, Math.floor(random() * 60));
      if (at > now) continue;

      // The house rule counts a person's drinks for the day, all kinds together.
      const totalSoFar = countTotalToday(person.id, at);
      const perDrinkSoFar = countToday(person.id, drink.id, at);
      const overLimit = (HOUSE_LIMIT !== null && totalSoFar >= HOUSE_LIMIT)
        || (drink.daily_limit !== null && perDrinkSoFar >= drink.daily_limit);
      // Someone occasionally goes over; most people stop at the nudge.
      if (overLimit && random() > 0.3) continue;

      addTake.run(person.id, drink.id, 1, overLimit ? 1 : 0, iso(at));
      noteToday(person.id, drink.id, at);
      takeCount++;
    }
  }

  // Someone restocks on Mondays, counting the shelf about half the time.
  if (dow === 1) {
    for (const drink of drinks) {
      if (random() > 0.7) continue;
      const expected = currentStock(drink.id);
      const counted = random() < 0.5
        ? Math.max(0, expected - Math.floor(random() * 5))
        : null;
      const added = drink.case_size;
      const at = utcForLocal(day, 8, 30);
      if (at > now) continue;
      addRestock.run(drink.id, added, counted, expected, pick(people).id, null, iso(at));
      // Nobody stacks more than a full shelf into the fridge.
      db.prepare('UPDATE drinks SET stock = MIN(?, ?) WHERE id = ?')
        .run((counted ?? expected) + added, drink.par_level, drink.id);
    }
  }
}

// Leave the fridge in a state worth looking at: a couple of drinks nearly out.
db.prepare("UPDATE drinks SET stock = 3 WHERE name = 'Monster'").run();
db.prepare("UPDATE drinks SET stock = 0 WHERE name = 'Perrier'").run();

function weightedPick(list) {
  const total = list.reduce((s, d) => s + (weight[d.name] ?? 1), 0);
  let r = random() * total;
  for (const d of list) {
    r -= weight[d.name] ?? 1;
    if (r <= 0) return d;
  }
  return list[list.length - 1];
}

/**
 * The UTC instant of a wall-clock time in the fridge's timezone, so seeded
 * demand lands during office hours rather than wherever UTC happens to put it.
 */
function utcForLocal(day, hour, minute) {
  const want = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute);
  let ts = want;
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  // Two passes settle the offset even across a DST boundary.
  for (let i = 0; i < 2; i++) {
    const got = {};
    for (const part of fmt.formatToParts(new Date(ts))) {
      if (part.type !== 'literal') got[part.type] = Number(part.value);
    }
    const landed = Date.UTC(got.year, got.month - 1, got.day, got.hour % 24, got.minute);
    if (landed === want) break;
    ts += want - landed;
  }
  return new Date(ts);
}

function countToday(personId, drinkId, at) {
  return seenToday.get(`${personId}:${drinkId}:${dayKey(at, TZ)}`) ?? 0;
}

function countTotalToday(personId, at) {
  return seenToday.get(`${personId}:*:${dayKey(at, TZ)}`) ?? 0;
}

function noteToday(personId, drinkId, at) {
  const day = dayKey(at, TZ);
  for (const key of [`${personId}:${drinkId}:${day}`, `${personId}:*:${day}`]) {
    seenToday.set(key, (seenToday.get(key) ?? 0) + 1);
  }
}

function currentStock(drinkId) {
  return db.prepare('SELECT stock FROM drinks WHERE id = ?').get(drinkId).stock;
}

function iso(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

console.log(`Seeded ${dbPath}: ${takeCount} check-ins across ${people.length} people over ${DAYS} days.`);
db.close();

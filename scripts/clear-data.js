#!/usr/bin/env node
/**
 * Clears logged activity — every person, every check-in, every restock —
 * and zeroes all stock counts, while leaving the drink list itself (names,
 * emoji, categories, par levels, case sizes, per-drink and house limits)
 * exactly as configured.
 *
 * For wiping the fridge back to its out-of-the-box state instead — including
 * drink customizations — delete the database file directly (see README).
 *
 *   FRIDGE_DB=data/fridge.db node scripts/clear-data.js
 */
import { openDb, clearActivity } from '../src/db.js';

const dbPath = process.env.FRIDGE_DB || 'data/fridge.db';
const db = openDb(dbPath);

const removed = clearActivity(db);

console.log(`Cleared ${removed.people} people, ${removed.takes} check-ins, ${removed.restocks} restocks.`);
console.log('Drink names, limits, and par levels were left exactly as they were. All stock reset to 0.');

db.close();

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS people (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS drinks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  emoji       TEXT    NOT NULL DEFAULT '🥤',
  category    TEXT    NOT NULL DEFAULT 'other',
  stock       INTEGER NOT NULL DEFAULT 0,
  par_level   INTEGER NOT NULL DEFAULT 24,
  case_size   INTEGER NOT NULL DEFAULT 12,
  daily_limit INTEGER,
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS takes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id  INTEGER NOT NULL REFERENCES people(id),
  drink_id   INTEGER NOT NULL REFERENCES drinks(id),
  qty        INTEGER NOT NULL DEFAULT 1,
  over_limit INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS restocks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  drink_id        INTEGER NOT NULL REFERENCES drinks(id),
  qty_added       INTEGER NOT NULL,
  counted_before  INTEGER,
  expected_before INTEGER,
  person_id       INTEGER REFERENCES people(id),
  note            TEXT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_takes_created  ON takes(created_at);
CREATE INDEX IF NOT EXISTS idx_takes_drink    ON takes(drink_id, created_at);
CREATE INDEX IF NOT EXISTS idx_takes_person   ON takes(person_id, created_at);
CREATE INDEX IF NOT EXISTS idx_restock_drink  ON restocks(drink_id, created_at);
`;

/**
 * The drinks the office actually stocks. Editable from the dashboard once
 * running; this is only what a brand-new fridge starts with.
 *
 * `daily_limit` here is an optional *per-drink* cap ("no more than one Monster
 * a day"). It starts unset on every drink because the house rule is a limit on
 * a person's total drinks per day, which lives in DEFAULT_SETTINGS below.
 */
const DEFAULT_DRINKS = [
  { name: 'Monster',       emoji: '👹', category: 'energy',  par_level: 48, case_size: 24, daily_limit: null, sort_order: 10 },
  { name: 'Perrier',       emoji: '🫧', category: 'water',   par_level: 48, case_size: 24, daily_limit: null, sort_order: 20 },
  { name: 'BioSteel',      emoji: '💧', category: 'sports',  par_level: 36, case_size: 12, daily_limit: null, sort_order: 30 },
  { name: 'Diet Soda',     emoji: '🥤', category: 'soda',    par_level: 48, case_size: 24, daily_limit: null, sort_order: 40 },
  { name: 'Protein Shake', emoji: '🥛', category: 'protein', par_level: 24, case_size: 12, daily_limit: null, sort_order: 50 },
];

const DEFAULT_SETTINGS = {
  // Drinks one person can take per day before the app asks "are you sure?".
  // A nudge, never a block. Change it from the dashboard.
  daily_total_limit: '2',
};

export function openDb(path = process.env.MAMI_DB || 'data/mami.db') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

/** Insert the starter drink list, but only into a fridge that has none yet. */
export function seedDrinks(db, drinks = DEFAULT_DRINKS) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM drinks').get();
  if (n > 0) return 0;
  const insert = db.prepare(
    `INSERT INTO drinks (name, emoji, category, stock, par_level, case_size, daily_limit, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const d of drinks) {
    insert.run(
      d.name, d.emoji, d.category,
      d.stock ?? 0, d.par_level, d.case_size,
      d.daily_limit ?? null, d.sort_order
    );
  }
  return drinks.length;
}

/** Fill in any setting the database doesn't have yet, leaving existing ones alone. */
export function seedSettings(db, settings = DEFAULT_SETTINGS) {
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(settings)) insert.run(key, String(value));
}

export function getSetting(db, key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(db, key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, String(value));
}

export { DEFAULT_DRINKS, DEFAULT_SETTINGS };

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, seedDrinks, seedSettings, getSetting, setSetting, clearActivity } from '../src/db.js';

function seededDb() {
  const db = openDb(':memory:');
  seedDrinks(db);
  seedSettings(db);
  return db;
}

test('clearActivity removes people, check-ins, and restocks', () => {
  const db = seededDb();
  const drink = db.prepare('SELECT * FROM drinks LIMIT 1').get();
  db.prepare('INSERT INTO people (name) VALUES (?)').run('Ada');
  db.prepare('INSERT INTO people (name) VALUES (?)').run('Grace');
  const person = db.prepare('SELECT * FROM people LIMIT 1').get();
  db.prepare('INSERT INTO takes (person_id, drink_id, qty) VALUES (?, ?, 1)').run(person.id, drink.id);
  db.prepare('INSERT INTO restocks (drink_id, qty_added, expected_before) VALUES (?, 24, 0)').run(drink.id);

  const removed = clearActivity(db);

  assert.equal(removed.people, 2);
  assert.equal(removed.takes, 1);
  assert.equal(removed.restocks, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM people').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM takes').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM restocks').get().n, 0);
});

test('clearActivity zeroes stock but leaves every other drink field untouched', () => {
  const db = seededDb();
  // Simulate a customized fridge: someone renamed a drink, changed its limit
  // and par level, and it currently has real stock on the shelf.
  const drink = db.prepare('SELECT * FROM drinks LIMIT 1').get();
  db.prepare('UPDATE drinks SET name = ?, daily_limit = 1, par_level = 60, stock = 42 WHERE id = ?')
    .run('Custom Cola', drink.id);

  clearActivity(db);

  const after = db.prepare('SELECT * FROM drinks WHERE id = ?').get(drink.id);
  assert.equal(after.stock, 0, 'stock resets to zero');
  assert.equal(after.name, 'Custom Cola', 'name survives');
  assert.equal(after.daily_limit, 1, 'per-drink limit survives');
  assert.equal(after.par_level, 60, 'par level survives');
  assert.equal(after.emoji, drink.emoji, 'emoji survives');
  assert.equal(after.category, drink.category, 'category survives');
  assert.equal(after.case_size, drink.case_size, 'case size survives');
  assert.equal(after.sort_order, drink.sort_order, 'sort order survives');
});

test('clearActivity leaves the house daily limit untouched', () => {
  const db = seededDb();
  setSetting(db, 'daily_total_limit', 4);

  clearActivity(db);

  assert.equal(getSetting(db, 'daily_total_limit'), '4');
});

test('clearActivity on an already-empty fridge is a harmless no-op', () => {
  const db = seededDb();
  const removed = clearActivity(db);
  assert.deepEqual(removed, { people: 0, takes: 0, restocks: 0 });
});

test('clearActivity does not touch drinks that were never active', () => {
  const db = seededDb();
  db.prepare('UPDATE drinks SET active = 0, stock = 5 WHERE id = (SELECT id FROM drinks LIMIT 1)').run();

  clearActivity(db);

  // Inactive (soft-deleted) drinks are still real rows and still get their
  // stock zeroed — there's no reason a hidden drink should keep a stale count.
  const row = db.prepare('SELECT stock, active FROM drinks WHERE active = 0').get();
  assert.equal(row.stock, 0);
  assert.equal(row.active, 0, 'stays hidden, clearing data does not resurrect it');
});

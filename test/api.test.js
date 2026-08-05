import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/db.js';
import { createApp } from '../src/server.js';

let base;
let server;
let db;

before(async () => {
  db = openDb(':memory:');
  const app = createApp({ db, tz: 'UTC', windowDays: 14, coverDays: 10 });
  server = app.server;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

beforeEach(() => {
  // Reset the mutable state between tests; the seeded drink list stays.
  db.exec('DELETE FROM takes; DELETE FROM restocks; DELETE FROM people');
  db.exec('UPDATE drinks SET stock = 24');
});

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = text; }
  return { status: res.status, payload, headers: res.headers };
}

const get = (path) => call('GET', path);
const post = (path, body) => call('POST', path, body ?? {});

async function addPerson(name) {
  const { payload } = await post('/api/people', { name });
  return payload.person;
}

function drinkNamed(drinks, name) {
  return drinks.find((d) => d.name === name);
}

/* ---------- seeding & state ---------- */

test('a fresh fridge is seeded with the drinks the office stocks', async () => {
  const { status, payload } = await get('/api/state');
  assert.equal(status, 200);
  const names = payload.drinks.map((d) => d.name);
  for (const expected of ['Monster', 'Parried', 'BioSteel', 'Diet Soda', 'Protein Shake']) {
    assert.ok(names.includes(expected), `missing ${expected}`);
  }
});

test('seeding does not duplicate drinks on restart', async () => {
  const before = (await get('/api/state')).payload.drinks.length;
  createApp({ db, tz: 'UTC' }); // simulates a second boot against the same file
  const after = (await get('/api/state')).payload.drinks.length;
  assert.equal(after, before);
});

/* ---------- people ---------- */

test('adding a person is idempotent by name', async () => {
  const first = await post('/api/people', { name: 'Ada' });
  assert.equal(first.status, 201);
  assert.equal(first.payload.existed, false);

  const again = await post('/api/people', { name: 'ada' });
  assert.equal(again.status, 200);
  assert.equal(again.payload.existed, true, 'names differing only in case are the same person');
  assert.equal(again.payload.person.id, first.payload.person.id);
});

test('blank and oversized names are rejected', async () => {
  assert.equal((await post('/api/people', { name: '   ' })).status, 400);
  assert.equal((await post('/api/people', { name: 'x'.repeat(41) })).status, 400);
});

/* ---------- logging a take ---------- */

test('logging a drink records it and decrements stock', async () => {
  const ada = await addPerson('Ada');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');

  const { status, payload } = await post('/api/takes', {
    person_id: ada.id, drink_id: monster.id,
  });

  assert.equal(status, 201);
  assert.equal(payload.logged, true);
  assert.equal(payload.drink.stock, monster.stock - 1);
  assert.equal(payload.takenToday, 1);
});

test('state reports what I personally took today', async () => {
  const ada = await addPerson('Ada');
  const grace = await addPerson('Grace');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');

  await post('/api/takes', { person_id: ada.id, drink_id: monster.id });
  await post('/api/takes', { person_id: grace.id, drink_id: monster.id });

  const { payload } = await get(`/api/state?person_id=${ada.id}`);
  assert.equal(payload.me.today, 1, 'only my own drinks');
  assert.equal(payload.me.byDrinkToday[monster.id], 1);
  assert.equal(payload.totals.today, 2, 'fridge total counts everyone');
});

test('unknown people and drinks are rejected', async () => {
  const ada = await addPerson('Ada');
  assert.equal((await post('/api/takes', { person_id: 9999, drink_id: 1 })).status, 400);
  assert.equal((await post('/api/takes', { person_id: ada.id, drink_id: 9999 })).status, 400);
});

test('quantity is clamped to a sane range', async () => {
  const ada = await addPerson('Ada');
  const water = drinkNamed((await get('/api/state')).payload.drinks, 'Sparkling Water');

  const { payload } = await post('/api/takes', {
    person_id: ada.id, drink_id: water.id, qty: 9999,
  });
  assert.equal(payload.take.qty, 12, 'clamped to 12, not 9999');
});

test('stock never goes negative even when the app has lost count', async () => {
  const ada = await addPerson('Ada');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');
  await call('PATCH', `/api/drinks/${monster.id}`, { stock: 0 });

  const { status, payload } = await post('/api/takes', {
    person_id: ada.id, drink_id: monster.id, acknowledged: true,
  });

  assert.equal(status, 201, 'the take is still recorded');
  assert.equal(payload.drink.stock, 0);
});

/* ---------- soft limits ---------- */

test('a take over the daily limit asks first and is not logged yet', async () => {
  const ada = await addPerson('Ada');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');
  assert.equal(monster.daily_limit, 2);

  await post('/api/takes', { person_id: ada.id, drink_id: monster.id });
  await post('/api/takes', { person_id: ada.id, drink_id: monster.id });

  const third = await post('/api/takes', { person_id: ada.id, drink_id: monster.id });
  assert.equal(third.status, 200);
  assert.equal(third.payload.logged, false);
  assert.equal(third.payload.needsConfirm, true);
  assert.match(third.payload.limit.message, /limit is 2/);

  const state = await get(`/api/state?person_id=${ada.id}`);
  assert.equal(state.payload.me.today, 2, 'the unconfirmed take was not recorded');
});

test('an acknowledged take over the limit is always logged', async () => {
  const ada = await addPerson('Ada');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');

  await post('/api/takes', { person_id: ada.id, drink_id: monster.id });
  await post('/api/takes', { person_id: ada.id, drink_id: monster.id });
  const third = await post('/api/takes', {
    person_id: ada.id, drink_id: monster.id, acknowledged: true,
  });

  assert.equal(third.status, 201);
  assert.equal(third.payload.logged, true);
  assert.equal(third.payload.take.over_limit, 1, 'flagged as an overage, but recorded');
  assert.equal(third.payload.takenToday, 3);
});

test('limits are per person, not per fridge', async () => {
  const ada = await addPerson('Ada');
  const grace = await addPerson('Grace');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');

  await post('/api/takes', { person_id: ada.id, drink_id: monster.id });
  await post('/api/takes', { person_id: ada.id, drink_id: monster.id });

  const graceFirst = await post('/api/takes', { person_id: grace.id, drink_id: monster.id });
  assert.equal(graceFirst.status, 201, "Ada's limit must not block Grace");
});

test('a drink with no limit never asks for confirmation', async () => {
  const ada = await addPerson('Ada');
  const water = drinkNamed((await get('/api/state')).payload.drinks, 'Sparkling Water');
  assert.equal(water.daily_limit, null);

  for (let i = 0; i < 5; i++) {
    const res = await post('/api/takes', { person_id: ada.id, drink_id: water.id });
    assert.equal(res.status, 201);
  }
});

/* ---------- undo ---------- */

test('undo removes the last take and returns the stock', async () => {
  const ada = await addPerson('Ada');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');
  const before = monster.stock;

  await post('/api/takes', { person_id: ada.id, drink_id: monster.id });
  const undo = await post('/api/takes/undo', { person_id: ada.id });

  assert.equal(undo.status, 200);
  assert.equal(undo.payload.drink.stock, before);
  const state = await get(`/api/state?person_id=${ada.id}`);
  assert.equal(state.payload.me.today, 0);
});

test('undo cannot touch someone else\'s take', async () => {
  const ada = await addPerson('Ada');
  const grace = await addPerson('Grace');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');

  const take = await post('/api/takes', { person_id: ada.id, drink_id: monster.id });
  const attempt = await post('/api/takes/undo', {
    person_id: grace.id, take_id: take.payload.take.id,
  });

  assert.equal(attempt.status, 404);
});

test('undo with nothing to undo is a clean 404', async () => {
  const ada = await addPerson('Ada');
  assert.equal((await post('/api/takes/undo', { person_id: ada.id })).status, 404);
});

test('an old take is no longer undoable', async () => {
  const ada = await addPerson('Ada');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');
  await post('/api/takes', { person_id: ada.id, drink_id: monster.id });

  db.prepare("UPDATE takes SET created_at = '2026-01-01T00:00:00Z'").run();
  const undo = await post('/api/takes/undo', { person_id: ada.id });
  assert.equal(undo.status, 409);
  assert.match(undo.payload.error, /too old/);
});

/* ---------- restocking ---------- */

test('restocking adds to stock and records what was expected', async () => {
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');

  const { status, payload } = await post('/api/restocks', {
    drink_id: monster.id, qty_added: 24,
  });

  assert.equal(status, 201);
  assert.equal(payload.drink.stock, monster.stock + 24);
  assert.equal(payload.expectedBefore, monster.stock);
});

test('a shelf count overrides the running tally and surfaces unlogged drinks', async () => {
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');
  // The app thinks 24 are on the shelf; the restocker finds only 18.
  const { payload } = await post('/api/restocks', {
    drink_id: monster.id, qty_added: 24, counted_before: 18,
  });

  assert.equal(payload.unlogged, 6, '6 drinks left without being logged');
  assert.equal(payload.drink.stock, 42, 'counted 18 + 24 added, not 24 + 24');
});

test('a shelf count higher than expected does not report negative shrinkage', async () => {
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');
  const { payload } = await post('/api/restocks', {
    drink_id: monster.id, qty_added: 0, counted_before: 30,
  });

  assert.equal(payload.unlogged, 0);
  assert.equal(payload.drink.stock, 30, 'a count alone is enough to correct the tally');
});

test('an empty restock is rejected', async () => {
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');
  const res = await post('/api/restocks', { drink_id: monster.id, qty_added: 0 });
  assert.equal(res.status, 400);
});

/* ---------- report ---------- */

test('the report drives the shopping list from real takes', async () => {
  const ada = await addPerson('Ada');
  const monster = drinkNamed((await get('/api/state')).payload.drinks, 'Monster');
  await call('PATCH', `/api/drinks/${monster.id}`, { stock: 5, par_level: 48 });

  for (let i = 0; i < 3; i++) {
    await post('/api/takes', { person_id: ada.id, drink_id: monster.id, acknowledged: true });
  }

  const { payload } = await get('/api/report?days=14&cover=10');
  const line = payload.shoppingList.find((d) => d.name === 'Monster');
  assert.ok(line, 'Monster should be on the shopping list');
  assert.equal(line.stock, 2, 'three takes came off the shelf');
  assert.equal(line.recommend, 46, 'refill the remaining 2 up to a full shelf of 48');
  assert.equal(line.cases, 2, 'rounded up to whole 24-packs');
  assert.equal(payload.people[0].name, 'Ada');
});

test('report window parameters are clamped to sane values', async () => {
  assert.equal((await get('/api/report?days=9999')).payload.windowDays, 90);
  assert.equal((await get('/api/report?days=0')).payload.windowDays, 1);
  assert.equal((await get('/api/report?days=abc')).payload.windowDays, 14);
});

/* ---------- drink configuration ---------- */

test('a drink can be added and reconfigured', async () => {
  const created = await post('/api/drinks', {
    name: 'Cold Brew', emoji: '☕', category: 'coffee',
    stock: 10, par_level: 20, case_size: 10, daily_limit: 1,
  });
  assert.equal(created.status, 201);

  const patched = await call('PATCH', `/api/drinks/${created.payload.drink.id}`, {
    daily_limit: null, par_level: 30,
  });
  assert.equal(patched.payload.drink.daily_limit, null);
  assert.equal(patched.payload.drink.par_level, 30);
});

test('duplicate drink names are refused', async () => {
  const res = await post('/api/drinks', { name: 'monster' });
  assert.equal(res.status, 409);
});

test('deleting a drink hides it without deleting its history', async () => {
  const created = await post('/api/drinks', { name: 'Kombucha', stock: 5 });
  const id = created.payload.drink.id;

  await call('DELETE', `/api/drinks/${id}`);
  const names = (await get('/api/state')).payload.drinks.map((d) => d.name);
  assert.ok(!names.includes('Kombucha'));
  assert.ok(db.prepare('SELECT * FROM drinks WHERE id = ?').get(id), 'row is retained');
});

test('patching an unknown drink is a 404', async () => {
  assert.equal((await call('PATCH', '/api/drinks/9999', { stock: 1 })).status, 404);
});

/* ---------- QR & static ---------- */

test('the QR endpoint serves an SVG for the check-in URL', async () => {
  const res = await fetch(`${base}/qr.svg?url=${encodeURIComponent('http://fridge.local:8080/')}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/svg+xml');
  const svg = await res.text();
  assert.match(svg, /^<svg /);
  assert.match(svg, /<path d="M/);
});

test('a QR payload too long to encode is a 400, not a crash', async () => {
  const res = await get(`/qr.svg?url=${encodeURIComponent('x'.repeat(5000))}`);
  assert.equal(res.status, 400);
});

test('the check-in page, dashboard, and print sheet are served', async () => {
  for (const [path, needle] of [
    ['/', 'Drink fridge'],
    ['/dashboard', 'Fridge report'],
    ['/print', 'Grabbing a drink?'],
    ['/app.js', 'takeDrink'],
    ['/styles.css', '.drink-card'],
  ]) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 200, `${path} should be served`);
    assert.match(await res.text(), new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${path} content`);
  }
});

test('path traversal cannot escape the public directory', async () => {
  for (const path of ['/../package.json', '/..%2fpackage.json', '/%2e%2e/src/db.js']) {
    const res = await fetch(`${base}${path}`);
    assert.ok(res.status === 403 || res.status === 404, `${path} leaked (${res.status})`);
    assert.doesNotMatch(await res.text(), /"name": "mami"/);
  }
});

/* ---------- robustness ---------- */

test('a malformed JSON body is a 400', async () => {
  const res = await fetch(`${base}/api/takes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{not json',
  });
  assert.equal(res.status, 400);
});

test('an oversized body is rejected', async () => {
  const res = await fetch(`${base}/api/people`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'x'.repeat(200000) }),
  }).catch(() => ({ status: 413 })); // the socket may be torn down mid-upload
  assert.ok([413, 400].includes(res.status), `unexpected ${res.status}`);
});

test('unknown API routes report a clean error', async () => {
  const res = await post('/api/nope', {});
  assert.equal(res.status, 405);
});

test('the config endpoint describes the fridge', async () => {
  const { payload } = await get('/api/config');
  assert.equal(payload.tz, 'UTC');
  assert.equal(payload.windowDays, 14);
  assert.equal(payload.adminRequired, false);
});

/* ---------- admin token ---------- */

test('an admin token gates fridge configuration but never check-in', async () => {
  const guardedDb = openDb(':memory:');
  const app = createApp({ db: guardedDb, tz: 'UTC', adminToken: 'secret' });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const guarded = `http://127.0.0.1:${app.server.address().port}`;

  try {
    const denied = await fetch(`${guarded}/api/drinks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Sneaky Soda' }),
    });
    assert.equal(denied.status, 401);

    const allowed = await fetch(`${guarded}/api/drinks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-mami-token': 'secret' },
      body: JSON.stringify({ name: 'Sneaky Soda' }),
    });
    assert.equal(allowed.status, 201);

    // Checking in must still work for everyone.
    const person = await fetch(`${guarded}/api/people`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada' }),
    });
    assert.equal(person.status, 201);
    const drinks = await (await fetch(`${guarded}/api/state`)).json();
    const take = await fetch(`${guarded}/api/takes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        person_id: (await person.json()).person.id,
        drink_id: drinks.drinks[0].id,
      }),
    });
    assert.equal(take.status, 201);
  } finally {
    await new Promise((resolve) => app.server.close(resolve));
    guardedDb.close();
  }
});

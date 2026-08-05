import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, seedDrinks, seedSettings, getSetting, setSetting } from './db.js';
import { report, limitCheck, dailyTotalCheck, dayKey } from './stats.js';
import { encode, toSvg } from './qr.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const MAX_BODY = 64 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

export function createApp(options = {}) {
  const config = {
    tz: options.tz || process.env.FRIDGE_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    windowDays: intOr(options.windowDays ?? process.env.FRIDGE_WINDOW_DAYS, 14),
    coverDays: intOr(options.coverDays ?? process.env.FRIDGE_COVER_DAYS, 10),
    baseUrl: options.baseUrl || process.env.FRIDGE_BASE_URL || '',
    adminToken: options.adminToken ?? process.env.FRIDGE_ADMIN_TOKEN ?? '',
  };

  const db = options.db || openDb(options.dbPath);
  if (options.seed !== false) seedDrinks(db);
  seedSettings(db);

  /** The house limit lives in the database so it can be changed from the dashboard. */
  function dailyLimit() {
    const raw = getSetting(db, 'daily_total_limit');
    if (raw === null || raw === '') return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  const q = {
    drinks: db.prepare('SELECT * FROM drinks WHERE active = 1 ORDER BY sort_order, name'),
    allDrinks: db.prepare('SELECT * FROM drinks ORDER BY sort_order, name'),
    drink: db.prepare('SELECT * FROM drinks WHERE id = ?'),
    people: db.prepare('SELECT * FROM people WHERE active = 1 ORDER BY name'),
    person: db.prepare('SELECT * FROM people WHERE id = ?'),
    personByName: db.prepare('SELECT * FROM people WHERE name = ? COLLATE NOCASE'),
    addPerson: db.prepare('INSERT INTO people (name) VALUES (?)'),
    takesSince: db.prepare('SELECT * FROM takes WHERE created_at >= ? ORDER BY created_at'),
    addTake: db.prepare('INSERT INTO takes (person_id, drink_id, qty, over_limit) VALUES (?, ?, ?, ?)'),
    take: db.prepare('SELECT * FROM takes WHERE id = ?'),
    delTake: db.prepare('DELETE FROM takes WHERE id = ?'),
    lastTakeFor: db.prepare('SELECT * FROM takes WHERE person_id = ? ORDER BY id DESC LIMIT 1'),
    bumpStock: db.prepare('UPDATE drinks SET stock = MAX(0, stock + ?) WHERE id = ?'),
    setStock: db.prepare('UPDATE drinks SET stock = ? WHERE id = ?'),
    addRestock: db.prepare(
      `INSERT INTO restocks (drink_id, qty_added, counted_before, expected_before, person_id, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    ),
    restocksSince: db.prepare('SELECT * FROM restocks WHERE created_at >= ? ORDER BY created_at'),
    addDrink: db.prepare(
      `INSERT INTO drinks (name, emoji, category, stock, par_level, case_size, daily_limit, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ),
  };

  /** Takes since `days` ago, which is all the report ever needs. */
  function takesWindow(days) {
    const since = new Date(Date.now() - (days + 2) * 86400000).toISOString();
    return q.takesSince.all(since);
  }

  function buildReport(days = config.windowDays, cover = config.coverDays) {
    const lookback = Math.max(days, 30);
    return report({
      drinks: q.drinks.all(),
      takes: takesWindow(lookback),
      restocks: q.restocksSince.all(new Date(Date.now() - lookback * 86400000).toISOString()),
      people: q.people.all(),
      now: new Date(),
      tz: config.tz,
      windowDays: days,
      coverDays: cover,
      dailyTotalLimit: dailyLimit(),
    });
  }

  /**
   * What one person has taken today — the total across every drink, plus the
   * per-drink breakdown. Both are needed: the house rule counts the total, and
   * a drink may carry its own cap on top.
   */
  function todayFor(personId) {
    const todayKey = dayKey(new Date(), config.tz);
    const rows = q.takesSince.all(new Date(Date.now() - 2 * 86400000).toISOString());
    let total = 0;
    const byDrink = new Map();
    for (const t of rows) {
      if (t.person_id !== personId) continue;
      if (dayKey(t.created_at, config.tz) !== todayKey) continue;
      total += t.qty;
      byDrink.set(t.drink_id, (byDrink.get(t.drink_id) ?? 0) + t.qty);
    }
    return { total, byDrink };
  }

  /**
   * Combine the house daily total with any per-drink cap. Whichever rule is hit
   * drives the nudge, with the house total taking precedence since it's the one
   * that governs how fast the fridge empties.
   */
  function checkLimits({ drink, today, qty }) {
    const house = dailyTotalCheck({ limit: dailyLimit(), takenToday: today.total, qty });
    const perDrink = limitCheck({ drink, takenToday: today.byDrink.get(drink.id) ?? 0, qty });

    const active = house.overLimit ? house
      : perDrink.overLimit ? perDrink
      : house.message ? house
      : perDrink;
    const remainings = [house.remaining, perDrink.remaining].filter((r) => typeof r === 'number');

    return {
      overLimit: house.overLimit || perDrink.overLimit,
      remaining: remainings.length ? Math.min(...remainings) : null,
      message: active.message,
      scope: active === house ? 'day' : 'drink',
    };
  }

  const handler = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    try {
      if (req.method === 'GET' || req.method === 'HEAD') {
        if (path === '/api/state') return json(res, 200, statePayload(url));
        if (path === '/api/report') {
          const days = clamp(intOr(url.searchParams.get('days'), config.windowDays), 1, 90);
          const cover = clamp(intOr(url.searchParams.get('cover'), config.coverDays), 1, 60);
          return json(res, 200, buildReport(days, cover));
        }
        if (path === '/api/config') {
          return json(res, 200, {
            tz: config.tz,
            windowDays: config.windowDays,
            coverDays: config.coverDays,
            baseUrl: config.baseUrl,
            dailyLimit: dailyLimit(),
            adminRequired: Boolean(config.adminToken),
          });
        }
        if (path === '/qr.svg') {
          const target = url.searchParams.get('url') || config.baseUrl || `${url.protocol}//${url.host}/`;
          const scale = clamp(intOr(url.searchParams.get('scale'), 8), 1, 40);
          let svg;
          try {
            svg = toSvg(encode(target, { ecl: 'M' }), { scale, border: 2 });
          } catch (err) {
            return json(res, 400, { error: err.message });
          }
          res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'no-cache' });
          return res.end(req.method === 'HEAD' ? undefined : svg);
        }

        const file = path === '/' ? 'index.html'
          : path === '/dashboard' ? 'dashboard.html'
          : path === '/print' ? 'print.html'
          : path.slice(1);
        return await sendStatic(res, file, req.method === 'HEAD');
      }

      const body = await readBody(req);

      if (req.method === 'POST' && path === '/api/people') {
        const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
        if (name.length < 1 || name.length > 40) {
          return json(res, 400, { error: 'Name must be 1-40 characters.' });
        }
        const existing = q.personByName.get(name);
        if (existing) return json(res, 200, { person: existing, existed: true });
        const info = q.addPerson.run(name);
        return json(res, 201, { person: q.person.get(info.lastInsertRowid), existed: false });
      }

      if (req.method === 'POST' && path === '/api/takes') {
        const person = q.person.get(intOr(body.person_id, 0));
        const drink = q.drink.get(intOr(body.drink_id, 0));
        if (!person) return json(res, 400, { error: 'Unknown person.' });
        if (!drink) return json(res, 400, { error: 'Unknown drink.' });
        const qty = clamp(intOr(body.qty, 1), 1, 12);

        const today = todayFor(person.id);
        const takenToday = today.byDrink.get(drink.id) ?? 0;
        const limit = checkLimits({ drink, today, qty });

        // The nudge is advisory: unless the client explicitly acknowledged it we
        // return it without logging, so the UI can confirm. Once acknowledged
        // (or when under the limit) the take is always recorded.
        if (limit.overLimit && !body.acknowledged) {
          return json(res, 200, {
            logged: false,
            needsConfirm: true,
            limit,
            drink,
            takenToday,
            takenTodayTotal: today.total,
          });
        }

        const info = q.addTake.run(person.id, drink.id, qty, limit.overLimit ? 1 : 0);
        q.bumpStock.run(-qty, drink.id);
        const updated = q.drink.get(drink.id);
        return json(res, 201, {
          logged: true,
          take: q.take.get(info.lastInsertRowid),
          drink: updated,
          limit,
          takenToday: takenToday + qty,
          takenTodayTotal: today.total + qty,
          lowStock: updated.stock <= 0 ? 'out' : updated.stock <= 3 ? 'low' : null,
        });
      }

      if (req.method === 'POST' && path === '/api/takes/undo') {
        const person = q.person.get(intOr(body.person_id, 0));
        if (!person) return json(res, 400, { error: 'Unknown person.' });
        const last = body.take_id ? q.take.get(intOr(body.take_id, 0)) : q.lastTakeFor.get(person.id);
        if (!last || last.person_id !== person.id) {
          return json(res, 404, { error: 'Nothing to undo.' });
        }
        // Only the most recent few minutes are undoable; older entries are history.
        if (Date.now() - Date.parse(last.created_at) > 10 * 60 * 1000) {
          return json(res, 409, { error: 'That entry is too old to undo. Ask whoever restocks to adjust the count.' });
        }
        q.delTake.run(last.id);
        q.bumpStock.run(last.qty, last.drink_id);
        return json(res, 200, { undone: last, drink: q.drink.get(last.drink_id) });
      }

      if (req.method === 'POST' && path === '/api/restocks') {
        const drink = q.drink.get(intOr(body.drink_id, 0));
        if (!drink) return json(res, 400, { error: 'Unknown drink.' });
        const qtyAdded = clamp(intOr(body.qty_added, 0), 0, 500);
        const hasCount = body.counted_before !== undefined && body.counted_before !== null
          && body.counted_before !== '';
        const countedBefore = hasCount ? clamp(intOr(body.counted_before, 0), 0, 500) : null;
        const personId = body.person_id ? intOr(body.person_id, 0) : null;
        if (personId && !q.person.get(personId)) return json(res, 400, { error: 'Unknown person.' });
        if (qtyAdded === 0 && !hasCount) {
          return json(res, 400, { error: 'Nothing to record: add a quantity or a shelf count.' });
        }

        const expectedBefore = drink.stock;
        q.addRestock.run(
          drink.id, qtyAdded, countedBefore, expectedBefore, personId,
          body.note ? String(body.note).slice(0, 200) : null
        );
        // A physical count is ground truth and replaces the running tally.
        const newStock = (hasCount ? countedBefore : expectedBefore) + qtyAdded;
        q.setStock.run(clamp(newStock, 0, 100000), drink.id);
        return json(res, 201, {
          drink: q.drink.get(drink.id),
          expectedBefore,
          countedBefore,
          unlogged: hasCount ? Math.max(0, expectedBefore - countedBefore) : null,
        });
      }

      // Fridge configuration. Gated behind a token when one is configured.
      if (path === '/api/settings' || path === '/api/drinks' || path.startsWith('/api/drinks/')) {
        if (config.adminToken && req.headers['x-fridge-token'] !== config.adminToken) {
          return json(res, 401, { error: 'Admin token required.' });
        }

        if (path === '/api/settings') {
          if (req.method !== 'PATCH' && req.method !== 'PUT') {
            return json(res, 405, { error: `${req.method} not supported here.` });
          }
          if (Object.hasOwn(body, 'daily_total_limit')) {
            const raw = body.daily_total_limit;
            // An empty value means "no house limit at all".
            if (raw === null || raw === '') setSetting(db, 'daily_total_limit', '');
            else {
              const n = intOr(raw, NaN);
              if (!Number.isFinite(n) || n < 0 || n > 99) {
                return json(res, 400, { error: 'The daily limit must be a whole number from 0 to 99, or blank for none.' });
              }
              setSetting(db, 'daily_total_limit', n);
            }
          }
          return json(res, 200, { dailyLimit: dailyLimit() });
        }

        if (req.method === 'POST' && path === '/api/drinks') {
          const name = String(body.name ?? '').trim();
          if (name.length < 1 || name.length > 40) return json(res, 400, { error: 'Name must be 1-40 characters.' });
          if (q.allDrinks.all().some((d) => d.name.toLowerCase() === name.toLowerCase())) {
            return json(res, 409, { error: 'That drink already exists.' });
          }
          const info = q.addDrink.run(
            name,
            String(body.emoji ?? '🥤').slice(0, 8),
            String(body.category ?? 'other').slice(0, 20),
            clamp(intOr(body.stock, 0), 0, 100000),
            clamp(intOr(body.par_level, 24), 0, 100000),
            clamp(intOr(body.case_size, 12), 1, 1000),
            body.daily_limit === null || body.daily_limit === undefined || body.daily_limit === ''
              ? null : clamp(intOr(body.daily_limit, 2), 0, 99),
            clamp(intOr(body.sort_order, 100), 0, 10000)
          );
          return json(res, 201, { drink: q.drink.get(info.lastInsertRowid) });
        }

        const id = intOr(path.split('/')[3], 0);
        const drink = q.drink.get(id);
        if (!drink) return json(res, 404, { error: 'Unknown drink.' });

        if (req.method === 'PATCH' || req.method === 'PUT') {
          const fields = {
            emoji: (v) => String(v).slice(0, 8),
            category: (v) => String(v).slice(0, 20),
            stock: (v) => clamp(intOr(v, drink.stock), 0, 100000),
            par_level: (v) => clamp(intOr(v, drink.par_level), 0, 100000),
            case_size: (v) => clamp(intOr(v, drink.case_size), 1, 1000),
            sort_order: (v) => clamp(intOr(v, drink.sort_order), 0, 10000),
            active: (v) => (v ? 1 : 0),
            daily_limit: (v) => (v === null || v === '' ? null : clamp(intOr(v, 0), 0, 99)),
            name: (v) => String(v).trim().slice(0, 40),
          };
          const sets = [], values = [];
          for (const [key, coerce] of Object.entries(fields)) {
            if (Object.hasOwn(body, key)) { sets.push(`${key} = ?`); values.push(coerce(body[key])); }
          }
          if (!sets.length) return json(res, 400, { error: 'No recognised fields to update.' });
          db.prepare(`UPDATE drinks SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
          return json(res, 200, { drink: q.drink.get(id) });
        }

        if (req.method === 'DELETE') {
          db.prepare('UPDATE drinks SET active = 0 WHERE id = ?').run(id);
          return json(res, 200, { drink: q.drink.get(id) });
        }
      }

      return json(res, 405, { error: `${req.method} not supported here.` });
    } catch (err) {
      if (err.code === 'BODY_TOO_LARGE') return json(res, 413, { error: 'Request too large.' });
      if (err.code === 'BAD_JSON') return json(res, 400, { error: 'Invalid JSON body.' });
      process.emitWarning(`fridge: ${err.stack || err.message}`);
      return json(res, 500, { error: 'Something went wrong.' });
    }
  };

  function statePayload(url) {
    const personId = intOr(url.searchParams.get('person_id'), 0);
    const rep = buildReport();
    const me = rep.people.find((p) => p.id === personId) || null;
    return {
      today: rep.todayKey,
      tz: config.tz,
      dailyLimit: rep.dailyTotalLimit,
      drinks: rep.drinks.map((d) => ({
        id: d.id, name: d.name, emoji: d.emoji, category: d.category,
        stock: d.stock, status: d.status, daily_limit: d.daily_limit,
        takenToday: d.takenToday, workdaysLeft: d.workdaysLeft,
      })),
      people: rep.people.map((p) => ({ id: p.id, name: p.name, today: p.today })),
      me: me && {
        id: me.id, name: me.name, today: me.today, byDrinkToday: me.byDrinkToday,
      },
      totals: rep.totals,
    };
  }

  async function sendStatic(res, file, headOnly) {
    const safe = normalize(file).replace(/^(\.\.[/\\])+/, '');
    if (safe.includes('..')) return json(res, 403, { error: 'Forbidden.' });
    try {
      const data = await readFile(join(PUBLIC_DIR, safe));
      res.writeHead(200, {
        'content-type': MIME[extname(safe)] || 'application/octet-stream',
        'cache-control': 'no-cache',
      });
      return res.end(headOnly ? undefined : data);
    } catch {
      return json(res, 404, { error: 'Not found.' });
    }
  }

  const server = createServer(handler);
  server.on('close', () => { if (!options.db) db.close(); });
  return { server, handler, db, config, buildReport };
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        const err = new Error('body too large');
        err.code = 'BODY_TOO_LARGE';
        req.destroy();
        return reject(err);
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {
        const err = new Error('bad json');
        err.code = 'BAD_JSON';
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function intOr(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

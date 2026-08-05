import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey, hourOf, isWorkday, shiftDay, dayRange,
  rateFor, projectRunout, stockStatus, limitCheck, report,
} from '../src/stats.js';

/* ---------- day arithmetic ---------- */

test('dayKey uses the fridge timezone, not UTC', () => {
  // 2:30am UTC is still the previous evening on the US west coast.
  assert.equal(dayKey('2026-08-05T02:30:00Z', 'UTC'), '2026-08-05');
  assert.equal(dayKey('2026-08-05T02:30:00Z', 'America/Los_Angeles'), '2026-08-04');
  assert.equal(dayKey('2026-08-05T02:30:00Z', 'Australia/Sydney'), '2026-08-05');
});

test('hourOf converts into local office hours', () => {
  assert.equal(hourOf('2026-08-05T14:00:00Z', 'UTC'), 14);
  assert.equal(hourOf('2026-08-05T14:00:00Z', 'America/New_York'), 10);
});

test('isWorkday marks Mon-Fri only', () => {
  assert.equal(isWorkday('2026-08-05'), true);  // Wednesday
  assert.equal(isWorkday('2026-08-07'), true);  // Friday
  assert.equal(isWorkday('2026-08-08'), false); // Saturday
  assert.equal(isWorkday('2026-08-09'), false); // Sunday
});

test('shiftDay crosses month and DST boundaries safely', () => {
  assert.equal(shiftDay('2026-08-05', 1), '2026-08-06');
  assert.equal(shiftDay('2026-08-01', -1), '2026-07-31');
  assert.equal(shiftDay('2026-03-08', 1), '2026-03-09'); // US DST change
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01');
});

test('dayRange is inclusive and oldest-first', () => {
  assert.deepEqual(dayRange('2026-08-05', 3), ['2026-08-03', '2026-08-04', '2026-08-05']);
});

/* ---------- burn rate ---------- */

const TODAY = '2026-08-05'; // a Wednesday

/** The 14-day window before TODAY holds exactly 10 workdays. */
function workdayTotals(perDay) {
  const totals = new Map();
  for (let i = 1; i <= 14; i++) {
    const key = shiftDay(TODAY, -i);
    if (isWorkday(key)) totals.set(key, perDay);
  }
  return totals;
}

test('rate is measured per workday and ignores today', () => {
  const dayTotals = workdayTotals(2);
  dayTotals.set(TODAY, 99); // today is partial and must not count
  const rate = rateFor({ dayTotals, todayKey: TODAY, windowDays: 14 });

  assert.equal(rate.workdays, 10);
  assert.equal(rate.total, 20);
  assert.equal(rate.perWorkday, 2);
  assert.equal(rate.perWeekendDay, 0);
});

test('weekend demand is reported separately, never averaged into the workday rate', () => {
  const dayTotals = workdayTotals(2);
  dayTotals.set('2026-08-01', 8); // a Saturday inside the window
  const rate = rateFor({ dayTotals, todayKey: TODAY, windowDays: 14 });

  assert.equal(rate.perWorkday, 2, 'weekend spike must not inflate the workday rate');
  assert.equal(rate.perWeekendDay, 2); // 8 units over 4 weekend days
});

test('a fridge younger than the window is not averaged over days it did not exist', () => {
  // Only two workdays of history: Mon 3rd and Tue 4th.
  const dayTotals = new Map([['2026-08-03', 6], ['2026-08-04', 6]]);
  const rate = rateFor({
    dayTotals, todayKey: TODAY, windowDays: 14, firstActiveKey: '2026-08-03',
  });

  assert.equal(rate.workdays, 2);
  assert.equal(rate.perWorkday, 6, 'should be 6/day, not 12/10 days');
});

test('no history yields a zero rate rather than a divide-by-zero', () => {
  const rate = rateFor({ dayTotals: new Map(), todayKey: TODAY, windowDays: 14 });
  assert.equal(rate.perWorkday, 0);
  assert.equal(rate.total, 0);
});

/* ---------- projection ---------- */

test('runout projection skips weekends', () => {
  const { workdaysLeft, runoutOn } = projectRunout({
    stock: 20, perWorkday: 2, todayKey: TODAY,
  });
  assert.equal(workdaysLeft, 10);
  // 10 workdays after Wed Aug 5 lands on Wed Aug 19, not Aug 15.
  assert.equal(runoutOn, '2026-08-19');
  assert.equal(isWorkday(runoutOn), true);
});

test('empty stock reads as out today; no burn rate reads as unknown', () => {
  assert.deepEqual(projectRunout({ stock: 0, perWorkday: 3, todayKey: TODAY }),
    { workdaysLeft: 0, runoutOn: TODAY });
  assert.deepEqual(projectRunout({ stock: 10, perWorkday: 0, todayKey: TODAY }),
    { workdaysLeft: null, runoutOn: null });
});

test('stockStatus escalates from ok to out', () => {
  assert.equal(stockStatus({ stock: 0, par_level: 24, workdaysLeft: 0 }), 'out');
  assert.equal(stockStatus({ stock: 2, par_level: 24, workdaysLeft: 0.7 }), 'critical');
  assert.equal(stockStatus({ stock: 6, par_level: 24, workdaysLeft: 3 }), 'low');
  assert.equal(stockStatus({ stock: 4, par_level: 48, workdaysLeft: null }), 'low',
    'a quarter of a full shelf is low even with no measured rate');
  assert.equal(stockStatus({ stock: 40, par_level: 48, workdaysLeft: 20 }), 'ok');
});

/* ---------- soft limits ---------- */

test('limitCheck nudges but never blocks', () => {
  const drink = { name: 'Monster', daily_limit: 2 };

  assert.deepEqual(limitCheck({ drink, takenToday: 0 }),
    { overLimit: false, message: null, remaining: 1 });

  const last = limitCheck({ drink, takenToday: 1 });
  assert.equal(last.overLimit, false);
  assert.match(last.message, /last Monster/);

  const over = limitCheck({ drink, takenToday: 2 });
  assert.equal(over.overLimit, true);
  assert.match(over.message, /You've had 2 Monsters today\. The limit is 2\./);
});

test('a drink with no limit never nudges', () => {
  const drink = { name: 'Sparkling Water', daily_limit: null };
  assert.deepEqual(limitCheck({ drink, takenToday: 12 }), { overLimit: false, message: null });
});

test('multi-unit takes are checked against the limit as a whole', () => {
  const drink = { name: 'Monster', daily_limit: 2 };
  assert.equal(limitCheck({ drink, takenToday: 0, qty: 3 }).overLimit, true);
  assert.equal(limitCheck({ drink, takenToday: 0, qty: 2 }).overLimit, false);
});

/* ---------- full report ---------- */

const NOW = new Date('2026-08-05T15:00:00Z');

function buildTakes({ drinkId, personId, perWorkday }) {
  const takes = [];
  for (let i = 1; i <= 14; i++) {
    const key = shiftDay(TODAY, -i);
    if (!isWorkday(key)) continue;
    for (let n = 0; n < perWorkday; n++) {
      takes.push({
        person_id: personId, drink_id: drinkId, qty: 1,
        created_at: `${key}T15:0${n}:00Z`,
      });
    }
  }
  return takes;
}

test('report ranks the shopping list by urgency and sizes it in cases', () => {
  const drinks = [
    { id: 1, name: 'Monster', emoji: '👹', category: 'energy', stock: 4, par_level: 48, case_size: 24, daily_limit: 2 },
    { id: 2, name: 'Sparkling Water', emoji: '🫧', category: 'water', stock: 46, par_level: 48, case_size: 24, daily_limit: null },
  ];
  const takes = [
    ...buildTakes({ drinkId: 1, personId: 1, perWorkday: 4 }),
    ...buildTakes({ drinkId: 2, personId: 2, perWorkday: 1 }),
  ];
  const people = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];

  const r = report({ drinks, takes, people, now: NOW, tz: 'UTC', windowDays: 14, coverDays: 10 });

  const monster = r.drinks.find((d) => d.name === 'Monster');
  assert.equal(monster.perWorkday, 4);
  assert.equal(monster.workdaysLeft, 1);
  assert.equal(monster.status, 'critical');
  // Refilling to par (48 - 4) needs 44, which is more than 10 days of demand.
  assert.equal(monster.recommend, 44);
  assert.equal(monster.cases, 2);

  assert.equal(r.shoppingList[0].name, 'Monster', 'most urgent drink comes first');
  assert.equal(r.totals.needsRestock, 2);
});

test('report attributes consumption per person against a fair share', () => {
  const drinks = [{ id: 1, name: 'Monster', emoji: '👹', category: 'energy', stock: 20, par_level: 48, case_size: 24, daily_limit: 2 }];
  const takes = [
    ...buildTakes({ drinkId: 1, personId: 1, perWorkday: 3 }), // 30
    ...buildTakes({ drinkId: 1, personId: 2, perWorkday: 1 }), // 10
  ];
  const people = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];

  const r = report({ drinks, takes, people, now: NOW, tz: 'UTC', windowDays: 14 });

  assert.equal(r.people[0].name, 'Ada', 'heaviest consumer sorts first');
  assert.equal(r.people[0].windowTotal, 30);
  assert.equal(r.people[1].windowTotal, 10);
  assert.equal(r.totals.inWindow, 40);
  assert.equal(r.totals.fairShare, 20);
});

test('report counts unlogged drinks from shelf counts', () => {
  const drinks = [{ id: 1, name: 'Monster', emoji: '👹', category: 'energy', stock: 24, par_level: 48, case_size: 24, daily_limit: 2 }];
  const restocks = [
    // The app expected 10 on the shelf but only 6 were there: 4 went unlogged.
    { drink_id: 1, qty_added: 24, expected_before: 10, counted_before: 6, created_at: '2026-08-04T12:00:00Z' },
    { drink_id: 1, qty_added: 24, expected_before: 8, counted_before: 8, created_at: '2026-07-28T12:00:00Z' },
  ];
  const takes = buildTakes({ drinkId: 1, personId: 1, perWorkday: 2 });

  const r = report({
    drinks, takes, restocks, people: [{ id: 1, name: 'Ada' }],
    now: NOW, tz: 'UTC', windowDays: 14,
  });

  assert.equal(r.totals.unlogged, 4);
  assert.equal(r.totals.audits, 2);
  assert.equal(r.totals.honesty, 0.833); // 20 logged of 24 actual
});

test('report history covers the whole window including empty days', () => {
  const drinks = [{ id: 1, name: 'Monster', emoji: '👹', category: 'energy', stock: 10, par_level: 24, case_size: 12, daily_limit: 2 }];
  const r = report({ drinks, takes: [], people: [], now: NOW, tz: 'UTC', windowDays: 14 });

  assert.equal(r.drinks[0].history.length, 14);
  assert.equal(r.drinks[0].history.at(-1).day, TODAY);
  assert.deepEqual(r.drinks[0].history.map((h) => h.qty), new Array(14).fill(0));
  assert.equal(r.totals.honesty, null, 'no shelf counts means no honesty figure');
});

test('report tallies time-of-day demand across the window', () => {
  const drinks = [{ id: 1, name: 'Monster', emoji: '👹', category: 'energy', stock: 10, par_level: 24, case_size: 12, daily_limit: 2 }];
  const takes = buildTakes({ drinkId: 1, personId: 1, perWorkday: 2 });
  const r = report({ drinks, takes, people: [], now: NOW, tz: 'UTC', windowDays: 14 });

  assert.equal(r.hourly[15], 20, 'all seeded takes are at 15:xx UTC');
  assert.equal(r.hourly.reduce((a, b) => a + b, 0), 20);
});

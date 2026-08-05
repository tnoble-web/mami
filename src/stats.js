/**
 * Pure analysis functions. No database, no I/O — everything here takes plain
 * rows and returns plain objects, so the forecasting rules are directly testable.
 *
 * All timestamps stored in the DB are UTC ISO strings. "Days" are local calendar
 * days in the fridge's configured timezone, because a 6pm-Pacific Monster is a
 * Monday drink even though UTC calls it Tuesday.
 */

const DAY_MS = 86400000;

/** Local calendar day ("YYYY-MM-DD") for a UTC timestamp, in the given timezone. */
export function dayKey(when, tz) {
  const d = when instanceof Date ? when : new Date(when);
  // en-CA formats as YYYY-MM-DD, which sorts lexicographically.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Local hour (0-23) for a UTC timestamp, in the given timezone. */
export function hourOf(when, tz) {
  const d = when instanceof Date ? when : new Date(when);
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    hour12: false,
  }).format(d);
  return Number(h) % 24;
}

/** Is this day key a Mon-Fri? Parsed at noon UTC so DST shifts can't move it. */
export function isWorkday(key) {
  const dow = new Date(`${key}T12:00:00Z`).getUTCDay();
  return dow >= 1 && dow <= 5;
}

/** Step a day key forward/backward by n days. */
export function shiftDay(key, n) {
  const t = new Date(`${key}T12:00:00Z`).getTime() + n * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** Inclusive list of day keys ending at `endKey`, `days` long, oldest first. */
export function dayRange(endKey, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(shiftDay(endKey, -i));
  return out;
}

/**
 * Consumption rate for one drink.
 *
 * Measured over complete days only — today is partial and would drag the
 * average down. Weekday and weekend demand differ enormously in an office, so
 * the rate that drives forecasting is per *workday*; weekends are reported
 * separately rather than averaged in.
 *
 * A fridge younger than the window is not punished for the days before it
 * existed: the window is clamped to the first day with any recorded activity.
 */
export function rateFor({ dayTotals, todayKey, windowDays, firstActiveKey }) {
  let start = shiftDay(todayKey, -windowDays);
  const end = shiftDay(todayKey, -1); // yesterday: last complete day
  if (firstActiveKey && firstActiveKey > start) start = firstActiveKey;
  if (start > end) {
    return { perWorkday: 0, perWeekendDay: 0, perDay: 0, workdays: 0, days: 0, total: 0 };
  }

  let workdays = 0, weekendDays = 0, workTotal = 0, weekendTotal = 0;
  for (let key = start; key <= end; key = shiftDay(key, 1)) {
    const qty = dayTotals.get(key) ?? 0;
    if (isWorkday(key)) { workdays++; workTotal += qty; }
    else { weekendDays++; weekendTotal += qty; }
  }

  const days = workdays + weekendDays;
  return {
    perWorkday: workdays ? workTotal / workdays : 0,
    perWeekendDay: weekendDays ? weekendTotal / weekendDays : 0,
    perDay: days ? (workTotal + weekendTotal) / days : 0,
    workdays,
    days,
    total: workTotal + weekendTotal,
  };
}

/**
 * How many workdays of stock are left, and the calendar date it runs out.
 * Weekends are skipped when walking forward, since nobody drinks on Saturday.
 */
export function projectRunout({ stock, perWorkday, todayKey, maxDays = 90 }) {
  if (stock <= 0) return { workdaysLeft: 0, runoutOn: todayKey };
  if (perWorkday <= 0) return { workdaysLeft: null, runoutOn: null };

  const workdaysLeft = stock / perWorkday;
  let remaining = workdaysLeft;
  let key = todayKey;
  for (let i = 0; i < maxDays * 2 && remaining > 0; i++) {
    key = shiftDay(key, 1);
    if (isWorkday(key)) remaining -= 1;
  }
  return { workdaysLeft, runoutOn: remaining > 0 ? null : key };
}

export function stockStatus({ stock, par_level, workdaysLeft }) {
  if (stock <= 0) return 'out';
  if (workdaysLeft !== null && workdaysLeft <= 1) return 'critical';
  if (workdaysLeft !== null && workdaysLeft <= 3) return 'low';
  if (par_level > 0 && stock / par_level <= 0.25) return 'low';
  return 'ok';
}

/**
 * Full fridge report.
 *
 * @param {object}  input
 * @param {Array}   input.drinks     rows from `drinks`
 * @param {Array}   input.takes      rows from `takes` (any range; filtered here)
 * @param {Array}   input.restocks   rows from `restocks`
 * @param {Array}   input.people     rows from `people`
 * @param {Date}    input.now
 * @param {string}  input.tz         IANA timezone
 * @param {number}  input.windowDays trailing complete days used for rates
 * @param {number}  input.coverDays  workdays of stock a restock should buy
 */
export function report({
  drinks, takes, restocks = [], people = [],
  now = new Date(), tz = 'UTC', windowDays = 14, coverDays = 10,
  dailyTotalLimit = null,
}) {
  const todayKey = dayKey(now, tz);
  const windowStart = shiftDay(todayKey, -windowDays);

  // Bucket takes by drink/day, by person, and by hour in a single pass.
  const byDrinkDay = new Map();   // drinkId -> Map(dayKey -> qty)
  const byPersonDay = new Map();  // personId -> Map(dayKey -> qty)
  const byPersonDrinkToday = new Map(); // personId -> Map(drinkId -> qty)
  const hourly = new Array(24).fill(0);
  let firstActiveKey = null;

  for (const t of takes) {
    const key = dayKey(t.created_at, tz);
    if (!firstActiveKey || key < firstActiveKey) firstActiveKey = key;

    // Time-of-day demand over the whole window, so restocking can be timed.
    if (key >= windowStart) hourly[hourOf(t.created_at, tz)] += t.qty;

    if (!byDrinkDay.has(t.drink_id)) byDrinkDay.set(t.drink_id, new Map());
    const dd = byDrinkDay.get(t.drink_id);
    dd.set(key, (dd.get(key) ?? 0) + t.qty);

    if (!byPersonDay.has(t.person_id)) byPersonDay.set(t.person_id, new Map());
    const pd = byPersonDay.get(t.person_id);
    pd.set(key, (pd.get(key) ?? 0) + t.qty);

    if (key === todayKey) {
      if (!byPersonDrinkToday.has(t.person_id)) byPersonDrinkToday.set(t.person_id, new Map());
      const pt = byPersonDrinkToday.get(t.person_id);
      pt.set(t.drink_id, (pt.get(t.drink_id) ?? 0) + t.qty);
    }
  }

  const drinkReports = drinks.map((d) => {
    const dayTotals = byDrinkDay.get(d.id) ?? new Map();
    const rate = rateFor({ dayTotals, todayKey, windowDays, firstActiveKey });
    const { workdaysLeft, runoutOn } = projectRunout({
      stock: d.stock, perWorkday: rate.perWorkday, todayKey,
    });
    const status = stockStatus({ stock: d.stock, par_level: d.par_level, workdaysLeft });

    // Buy enough to refill to par, but at least enough to cover expected
    // demand for `coverDays` workdays.
    const toPar = Math.max(0, d.par_level - d.stock);
    const toCover = Math.max(0, Math.ceil(rate.perWorkday * coverDays) - d.stock);
    const recommend = Math.max(toPar, toCover);

    return {
      id: d.id,
      name: d.name,
      emoji: d.emoji,
      category: d.category,
      stock: d.stock,
      par_level: d.par_level,
      case_size: d.case_size,
      daily_limit: d.daily_limit,
      perWorkday: round(rate.perWorkday, 2),
      perWeekendDay: round(rate.perWeekendDay, 2),
      takenInWindow: rate.total,
      workdaysLeft: workdaysLeft === null ? null : round(workdaysLeft, 1),
      runoutOn,
      status,
      takenToday: sumDays(dayTotals, todayKey, todayKey),
      recommend,
      cases: d.case_size > 0 ? Math.ceil(recommend / d.case_size) : 0,
      history: dayRange(todayKey, windowDays).map((key) => ({
        day: key,
        qty: dayTotals.get(key) ?? 0,
        workday: isWorkday(key),
      })),
    };
  });

  // Per-person totals over the window, plus a fair-share baseline.
  const peopleReports = people.map((p) => {
    const pd = byPersonDay.get(p.id) ?? new Map();
    const windowTotal = sumDays(pd, windowStart, todayKey);

    // Days this person went past the house limit. Counted, never enforced —
    // it's how you tell whether the limit is set somewhere sensible.
    let overLimitDays = 0;
    if (dailyTotalLimit !== null) {
      for (const [key, qty] of pd) {
        if (key >= windowStart && key <= todayKey && qty > dailyTotalLimit) overLimitDays++;
      }
    }

    return {
      id: p.id,
      name: p.name,
      today: sumDays(pd, todayKey, todayKey),
      windowTotal,
      perWorkday: round(windowTotal / Math.max(1, countWorkdays(windowStart, todayKey)), 2),
      overLimitDays,
      byDrinkToday: Object.fromEntries(byPersonDrinkToday.get(p.id) ?? []),
    };
  }).sort((a, b) => b.windowTotal - a.windowTotal);

  const totalInWindow = peopleReports.reduce((s, p) => s + p.windowTotal, 0);
  const loggers = peopleReports.filter((p) => p.windowTotal > 0).length;
  const fairShare = loggers ? round(totalInWindow / loggers, 1) : 0;

  // Unlogged drinks, measured whenever a restocker counts the shelf before refilling.
  let unlogged = 0, auditedLogged = 0, audits = 0;
  for (const r of restocks) {
    if (r.counted_before === null || r.counted_before === undefined) continue;
    if (r.expected_before === null || r.expected_before === undefined) continue;
    audits++;
    const gap = r.expected_before - r.counted_before;
    if (gap > 0) unlogged += gap;
  }
  auditedLogged = totalInWindow;
  const honesty = audits === 0 ? null
    : round(auditedLogged / Math.max(1, auditedLogged + unlogged), 3);

  // Worth a trip to the shop: anything running low, plus well-stocked drinks
  // only once the gap is at least half a case. Drinks are bought by the case, so
  // "buy 1 BioSteel" is noise on a shopping list, not information.
  const shoppingList = drinkReports
    .filter((d) => d.recommend > 0
      && (d.status !== 'ok' || d.recommend * 2 >= d.case_size))
    .sort((a, b) => statusRank(a.status) - statusRank(b.status)
      || (a.workdaysLeft ?? 999) - (b.workdaysLeft ?? 999));

  return {
    generatedAt: now.toISOString(),
    todayKey,
    tz,
    windowDays,
    coverDays,
    dailyTotalLimit,
    drinks: drinkReports,
    people: peopleReports,
    shoppingList,
    hourly,
    totals: {
      today: drinkReports.reduce((s, d) => s + d.takenToday, 0),
      inWindow: totalInWindow,
      fairShare,
      overLimitDays: peopleReports.reduce((s, p) => s + p.overLimitDays, 0),
      stock: drinkReports.reduce((s, d) => s + d.stock, 0),
      unlogged,
      audits,
      honesty,
      needsRestock: shoppingList.length,
      outOfStock: drinkReports.filter((d) => d.status === 'out').length,
    },
  };
}

/**
 * The house rule: how many drinks one person takes per day, all kinds counted
 * together. This is the limit that actually governs how fast the fridge empties
 * — a per-drink cap of two still allows ten drinks a day across five shelves.
 *
 * Like every limit here it only ever nudges. Never blocks.
 */
export function dailyTotalCheck({ limit, takenToday, qty = 1 }) {
  if (limit === null || limit === undefined) return { overLimit: false, message: null };
  const after = takenToday + qty;

  if (after <= limit) {
    const remaining = limit - after;
    return {
      overLimit: false,
      remaining,
      message: remaining === 0
        ? `That's ${after} for today — your limit.`
        : null,
    };
  }

  return {
    overLimit: true,
    remaining: 0,
    message: takenToday === 0
      ? `Heads up: the limit is ${limit} drinks a day.`
      : `You've already had ${takenToday} drink${takenToday === 1 ? '' : 's'} today. The limit is ${limit} a day.`,
  };
}

/**
 * Optional per-drink cap, on top of the daily total ("at most one Monster, even
 * within your two drinks"). Unset on every drink by default.
 *
 * Never blocks either — it returns the nudge the UI should show, and the caller
 * logs the take regardless. A hard block just teaches people to take the drink
 * without logging it, which is worse than an honest overage.
 */
export function limitCheck({ drink, takenToday, qty = 1 }) {
  const limit = drink.daily_limit;
  if (limit === null || limit === undefined) return { overLimit: false, message: null };
  const after = takenToday + qty;
  if (after <= limit) {
    const left = limit - after;
    return {
      overLimit: false,
      message: left === 0 ? `That's your last ${drink.name} for today.` : null,
      remaining: left,
    };
  }
  return {
    overLimit: true,
    remaining: 0,
    message: takenToday === 0
      ? `Heads up: the daily limit for ${drink.name} is ${limit}.`
      : `You've had ${takenToday} ${drink.name}${takenToday === 1 ? '' : 's'} today. The limit is ${limit}.`,
  };
}

function statusRank(status) {
  return { out: 0, critical: 1, low: 2, ok: 3 }[status] ?? 4;
}

function sumDays(dayTotals, fromKey, toKey) {
  let sum = 0;
  for (const [key, qty] of dayTotals) if (key >= fromKey && key <= toKey) sum += qty;
  return sum;
}

function countWorkdays(fromKey, toKey) {
  let n = 0;
  for (let key = fromKey; key <= toKey; key = shiftDay(key, 1)) if (isWorkday(key)) n++;
  return n;
}

function round(n, places) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

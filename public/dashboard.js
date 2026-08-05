/**
 * Fridge report: what's running out, how fast, and what to buy.
 *
 * Charts are hand-built SVG following the project's viz rules: one categorical
 * hue for the data, de-emphasis gray for weekends, hairline gridlines, 4px
 * rounded data-ends, a 2px surface gap between adjacent columns, hover
 * tooltips, and a table view behind every chart.
 */

import { fridgeMascot, moodForDrinks } from './mascot.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BAR_MAX = 24;   // never let a column fill its whole band
const BAR_GAP = 2;    // surface gap between adjacent columns
const RADIUS = 4;     // rounded data-end

const el = (id) => document.getElementById(id);
const state = { report: null, token: sessionStorage.getItem('fridge.token') || '' };

/* ---------- data ---------- */

async function load() {
  const days = el('window-select').value;
  const cover = el('cover-select').value;
  const res = await fetch(`/api/report?days=${days}&cover=${cover}`);
  if (!res.ok) throw new Error(`Report failed (${res.status})`);
  state.report = await res.json();
  render();
}

/* ---------- render ---------- */

function render() {
  const r = state.report;
  const generated = new Date(r.generatedAt);

  el('meta').textContent = `${r.tz} · updated ${generated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  el('limit-select').value = r.dailyTotalLimit === null ? '' : String(r.dailyTotalLimit);
  el('logo-mascot').innerHTML = fridgeMascot(moodForDrinks(r.drinks), 34);

  renderTiles(r);
  renderBuyList(r);
  renderDailyChart(r);
  renderHourlyChart(r);
  renderStockTable(r);
  renderPeopleTable(r);

  el('footnote').textContent =
    `Rates are per workday over the last ${r.windowDays} days, ignoring today (it's still in progress). `
    + `"Runs out" skips weekends.`;
}

function renderTiles(r) {
  const t = r.totals;
  const worst = r.drinks
    .filter((d) => d.workdaysLeft !== null)
    .sort((a, b) => a.workdaysLeft - b.workdaysLeft)[0];

  const tiles = [
    {
      label: 'Taken today',
      value: t.today,
      sub: `${t.inWindow} in the last ${r.windowDays} days`,
    },
    {
      label: 'Needs restocking',
      value: t.needsRestock,
      sub: t.outOfStock ? `${t.outOfStock} already empty` : 'nothing empty yet',
      tone: t.outOfStock > 0 ? 'is-bad' : t.needsRestock > 0 ? 'is-warn' : 'is-ok',
    },
    {
      label: 'Runs out first',
      value: worst ? worst.emoji : '—',
      sub: worst
        ? `${worst.name} · ${formatDays(worst.workdaysLeft)}`
        : 'no consumption recorded yet',
      tone: worst && worst.workdaysLeft <= 2 ? 'is-bad' : '',
    },
    {
      label: 'Unlogged',
      value: t.audits ? t.unlogged : '—',
      sub: t.audits
        ? `across ${t.audits} shelf count${t.audits === 1 ? '' : 's'}`
        : 'count the shelf when restocking',
      tone: t.unlogged > 0 ? 'is-warn' : '',
    },
  ];

  el('tiles').replaceChildren(...tiles.map((tile) => {
    const box = node('div', 'tile');
    box.append(
      text('div', 'tile-label', tile.label),
      text('div', `tile-value ${tile.tone ?? ''}`.trim(), String(tile.value)),
      text('div', 'tile-sub', tile.sub),
    );
    return box;
  }));
}

function renderBuyList(r) {
  const list = r.shoppingList;
  el('buy-sub').textContent = list.length
    ? `Enough to refill the shelf and cover ${r.coverDays} workdays.`
    : 'Everything is stocked.';

  if (!list.length) {
    el('buy-list').replaceChildren(text('p', 'empty-note', 'Nothing to buy right now. 🎉'));
    return;
  }

  el('buy-list').replaceChildren(...list.map((d) => {
    const row = node('div', 'buy-line');
    const left = node('div');
    left.append(
      text('div', 'buy-name', `${d.emoji} ${d.name}`),
      text('div', 'buy-why', whyBuy(d)),
    );
    const qty = node('div', 'buy-qty');
    qty.append(document.createTextNode(`${d.recommend}`));
    qty.append(text('small', '', d.cases === 1 ? '1 case' : `${d.cases} cases`));
    row.append(left, qty);
    return row;
  }));
}

function whyBuy(d) {
  if (d.status === 'out') return 'empty right now';
  const rate = d.perWorkday > 0 ? `${d.perWorkday}/day` : 'no recent takes';
  const left = d.workdaysLeft === null ? '' : ` · ${leftPhrase(d.workdaysLeft)}`;
  return `${d.stock} in stock · ${rate}${left}`;
}

/** Bare duration, for a tile or a table cell. */
function formatDays(workdaysLeft) {
  if (workdaysLeft === null) return 'no burn rate yet';
  if (workdaysLeft <= 0) return 'gone';
  if (workdaysLeft < 1) return 'less than a day';
  if (workdaysLeft < 2) return 'about a day';
  return `${Math.round(workdaysLeft)} workdays`;
}

/** The same duration phrased as remaining supply, for running prose. */
function leftPhrase(workdaysLeft) {
  if (workdaysLeft === null) return 'no burn rate yet';
  if (workdaysLeft <= 0) return 'nothing left';
  return `${formatDays(workdaysLeft)} left`;
}

/* ---------- charts ---------- */

/**
 * Column chart. `bars` is [{ label, value, muted, tooltip }].
 * Single series, so no legend box is drawn here — the card title names it.
 */
function columnChart(bars, { height = 150, labelEvery = 1 } = {}) {
  const padTop = 16, padBottom = 22, padLeft = 28, padRight = 4;
  const plotH = height - padTop - padBottom;
  const width = Math.max(240, bars.length * 34 + padLeft + padRight);
  const plotW = width - padLeft - padRight;

  const max = Math.max(1, ...bars.map((b) => b.value));
  const ticks = niceTicks(max);
  const scaleMax = ticks[ticks.length - 1];
  const y = (v) => padTop + plotH - (v / scaleMax) * plotH;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'chart');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');

  // Gridlines: hairline, solid, recessive. Tick labels are clean numbers.
  for (const t of ticks) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('class', 'grid-line');
    line.setAttribute('x1', padLeft);
    line.setAttribute('x2', width - padRight);
    line.setAttribute('y1', y(t));
    line.setAttribute('y2', y(t));
    svg.append(line);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('class', 'axis-text');
    label.setAttribute('x', padLeft - 6);
    label.setAttribute('y', y(t) + 3.5);
    label.setAttribute('text-anchor', 'end');
    label.textContent = String(t);
    svg.append(label);
  }

  const band = plotW / bars.length;
  const barW = Math.min(BAR_MAX, Math.max(4, band - BAR_GAP));

  bars.forEach((b, i) => {
    const cx = padLeft + band * i + band / 2;
    const x = cx - barW / 2;

    // Hit target spans the full band height so short columns stay hoverable.
    const hit = document.createElementNS(SVG_NS, 'rect');
    hit.setAttribute('class', 'hit');
    hit.setAttribute('x', padLeft + band * i);
    hit.setAttribute('y', padTop);
    hit.setAttribute('width', band);
    hit.setAttribute('height', plotH);
    hit.setAttribute('tabindex', '0');
    hit.setAttribute('role', 'presentation');
    attachTooltip(hit, b.tooltip);
    svg.append(hit);

    if (b.value > 0) {
      const h = Math.max(2, padTop + plotH - y(b.value));
      const bar = document.createElementNS(SVG_NS, 'path');
      bar.setAttribute('class', `bar${b.muted ? ' is-weekend' : ''}`);
      bar.setAttribute('d', roundedTopBar(x, padTop + plotH - h, barW, h));
      svg.append(bar);
    }

    if (i % labelEvery === 0) {
      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('class', 'axis-text');
      label.setAttribute('x', cx);
      label.setAttribute('y', height - 7);
      label.setAttribute('text-anchor', 'middle');
      label.textContent = b.label;
      svg.append(label);
    }
  });

  return svg;
}

/** Rounded at the data-end, square at the baseline. */
function roundedTopBar(x, y, w, h) {
  const r = Math.min(RADIUS, h, w / 2);
  return `M${x},${y + h}L${x},${y + r}Q${x},${y} ${x + r},${y}`
    + `L${x + w - r},${y}Q${x + w},${y} ${x + w},${y + r}`
    + `L${x + w},${y + h}Z`;
}

function niceTicks(max) {
  const target = 4;
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const ticks = [];
  for (let v = 0; v <= max + step / 2; v += step) ticks.push(Math.round(v));
  if (ticks.length < 2) ticks.push(step);
  return ticks;
}

function renderDailyChart(r) {
  // Every drink's history covers the same day range, so summing index-wise is safe.
  const days = r.drinks[0]?.history ?? [];
  const totals = days.map((d, i) => ({
    day: d.day,
    workday: d.workday,
    qty: r.drinks.reduce((sum, drink) => sum + (drink.history[i]?.qty ?? 0), 0),
  }));

  const busiest = totals.reduce((best, d) => (d.qty > (best?.qty ?? -1) ? d : best), null);
  el('daily-sub').textContent = busiest && busiest.qty > 0
    ? `Busiest day was ${formatDay(busiest.day)} — ${busiest.qty} drinks.`
    : 'No drinks logged yet in this window.';

  const bars = totals.map((d) => ({
    label: weekdayInitial(d.day),
    value: d.qty,
    muted: !d.workday,
    tooltip: `${formatDay(d.day)}\n${d.qty} drink${d.qty === 1 ? '' : 's'}${d.workday ? '' : ' · weekend'}`,
  }));

  el('daily-chart').replaceChildren(columnChart(bars, { height: 160 }));
  el('daily-table').replaceChildren(simpleTable(
    ['Day', 'Drinks'],
    totals.map((d) => [formatDay(d.day) + (d.workday ? '' : ' (weekend)'), d.qty]),
  ));
}

function renderHourlyChart(r) {
  const hours = r.hourly ?? [];
  const total = hours.reduce((a, b) => a + b, 0);
  const peak = hours.indexOf(Math.max(...hours));

  el('hourly-sub').textContent = total > 0
    ? `Peak is ${formatHour(peak)}. Restock before then, not after.`
    : 'No drinks logged yet in this window.';

  // Office hours only; 3am has no signal and eats horizontal space.
  const from = 6, to = 20;
  const bars = [];
  for (let h = from; h <= to; h++) {
    bars.push({
      label: h % 3 === 0 ? formatHour(h) : '',
      value: hours[h] ?? 0,
      muted: false,
      tooltip: `${formatHour(h)}\n${hours[h] ?? 0} drink${hours[h] === 1 ? '' : 's'}`,
    });
  }
  const outside = hours.reduce((sum, v, h) => sum + (h < from || h > to ? v : 0), 0);

  el('hourly-chart').replaceChildren(columnChart(bars, { height: 150 }));
  el('hourly-table').replaceChildren(simpleTable(
    ['Hour', 'Drinks'],
    hours.map((v, h) => [formatHour(h), v]).filter(([, v]) => v > 0),
  ));
  if (outside > 0) {
    el('hourly-sub').textContent += ` (${outside} outside ${formatHour(from)}–${formatHour(to)}.)`;
  }
}

/** 14-day sparkline: same hue, same weekend gray, no axes. */
function sparkline(history) {
  const w = 74, h = 22;
  const max = Math.max(1, ...history.map((d) => d.qty));
  const band = w / history.length;
  const barW = Math.max(2, band - BAR_GAP);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'spark');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.setAttribute('aria-hidden', 'true');

  history.forEach((d, i) => {
    if (d.qty <= 0) return;
    const barH = Math.max(1.5, (d.qty / max) * h);
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', `spark-bar${d.workday ? '' : ' is-weekend'}`);
    rect.setAttribute('x', (band * i + BAR_GAP / 2).toFixed(2));
    rect.setAttribute('y', (h - barH).toFixed(2));
    rect.setAttribute('width', barW.toFixed(2));
    rect.setAttribute('height', barH.toFixed(2));
    rect.setAttribute('rx', Math.min(1.5, barW / 2));
    svg.append(rect);
  });
  return svg;
}

/* ---------- tables ---------- */

function renderStockTable(r) {
  el('stock-sub').textContent = `Burn rate per workday over the last ${r.windowDays} days.`;

  const table = node('table');
  table.append(headRow(['Drink', `Last ${r.windowDays}d`, 'In stock', 'Per workday', 'Runs out', '', '']));
  const tbody = node('tbody');

  for (const d of r.drinks) {
    const tr = node('tr');

    const nameCell = node('td');
    nameCell.textContent = `${d.emoji} ${d.name}`;
    tr.append(nameCell);

    const sparkCell = node('td');
    sparkCell.append(sparkline(d.history));
    tr.append(sparkCell);

    tr.append(numCell(`${d.stock}`), numCell(d.perWorkday > 0 ? d.perWorkday.toFixed(1) : '—'));

    const runout = node('td', 'num');
    runout.textContent = d.status === 'out' ? 'gone'
      : d.runoutOn ? formatDay(d.runoutOn)
      : formatDays(d.workdaysLeft);
    tr.append(runout);

    const pillCell = node('td');
    pillCell.append(text('span', `pill ${d.status}`, statusWord(d)));
    tr.append(pillCell);

    const editCell = node('td');
    const edit = node('button', 'btn btn-quiet');
    edit.style.padding = '5px 11px';
    edit.style.fontSize = '.8rem';
    edit.textContent = 'Adjust';
    edit.addEventListener('click', () => openEdit(d));
    editCell.append(edit);
    tr.append(editCell);

    tbody.append(tr);
  }
  table.append(tbody);
  el('stock-table').replaceChildren(table);
}

function statusWord(d) {
  return { out: 'empty', critical: 'today', low: 'low', ok: 'ok' }[d.status] ?? d.status;
}

function renderPeopleTable(r) {
  const loggers = r.people.filter((p) => p.windowTotal > 0);
  const limitNote = r.dailyTotalLimit === null ? ''
    : ` · limit is ${r.dailyTotalLimit} a day`;
  el('people-sub').textContent = loggers.length
    ? `${loggers.length} people logging · fair share is ${r.totals.fairShare} each over ${r.windowDays} days${limitNote}.`
    : 'Nobody has logged a drink yet.';

  if (!loggers.length) {
    el('people-table').replaceChildren(
      text('p', 'empty-note', 'Once people start checking in, their totals show up here.'));
    return;
  }

  const hasLimit = r.dailyTotalLimit !== null;
  const headers = ['Person', 'Today', `Last ${r.windowDays}d`, 'Per workday', 'vs fair share'];
  if (hasLimit) headers.push('Days over');

  const table = node('table');
  table.append(headRow(headers));
  const tbody = node('tbody');
  for (const p of loggers) {
    const tr = node('tr');
    tr.append(text('td', '', p.name), numCell(String(p.today)), numCell(String(p.windowTotal)),
      numCell(p.perWorkday.toFixed(1)));
    const delta = r.totals.fairShare > 0
      ? Math.round((p.windowTotal / r.totals.fairShare) * 100) : 0;
    tr.append(numCell(delta ? `${delta}%` : '—'));
    if (hasLimit) tr.append(numCell(p.overLimitDays > 0 ? String(p.overLimitDays) : '—'));
    tbody.append(tr);
  }
  table.append(tbody);
  el('people-table').replaceChildren(table);
}

function simpleTable(headers, rows) {
  const table = node('table');
  table.append(headRow(headers));
  const tbody = node('tbody');
  for (const row of rows) {
    const tr = node('tr');
    row.forEach((cell, i) => tr.append(i === 0 ? text('td', '', String(cell)) : numCell(String(cell))));
    tbody.append(tr);
  }
  table.append(tbody);
  if (!rows.length) return text('p', 'empty-note', 'Nothing recorded yet.');
  return table;
}

function headRow(headers) {
  const thead = node('thead');
  const tr = node('tr');
  for (const h of headers) tr.append(text('th', '', h));
  thead.append(tr);
  return thead;
}

/* ---------- edit ---------- */

let editing = null;

function openEdit(drink) {
  editing = drink;
  el('edit-title').textContent = `${drink.emoji} ${drink.name}`;
  el('edit-name').value = drink.name;
  el('edit-stock').value = drink.stock;
  el('edit-par').value = drink.par_level;
  el('edit-case').value = drink.case_size;
  el('edit-limit').value = drink.daily_limit ?? '';
  el('edit-error').hidden = true;
  el('edit-sheet').showModal();
}

el('edit-sheet').addEventListener('click', (event) => {
  if (event.target.dataset.close !== undefined) el('edit-sheet').close();
});

el('edit-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorBox = el('edit-error');
  errorBox.hidden = true;
  const limit = el('edit-limit').value;

  const body = {
    name: el('edit-name').value.trim(),
    stock: Number(el('edit-stock').value),
    par_level: Number(el('edit-par').value),
    case_size: Number(el('edit-case').value),
    daily_limit: limit === '' ? null : Number(limit),
  };
  if (!body.name) {
    errorBox.textContent = 'The drink needs a name.';
    errorBox.hidden = false;
    return;
  }

  try {
    await patch(`/api/drinks/${editing.id}`, body);
    el('edit-sheet').close();
    await load();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.hidden = false;
  }
});

/**
 * PATCH something behind the admin gate, asking for the token once if the
 * server wants one and remembering it for the rest of the session.
 */
async function patch(path, body) {
  const send = () => fetch(path, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      ...(state.token ? { 'x-fridge-token': state.token } : {}),
    },
    body: JSON.stringify(body),
  });

  let res = await send();
  if (res.status === 401) {
    const token = prompt('Admin token required to change the fridge setup:');
    if (!token) throw new Error('Cancelled.');
    state.token = token;
    sessionStorage.setItem('fridge.token', token);
    res = await send();
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Save failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

/* ---------- tooltip ---------- */

function attachTooltip(target, content) {
  const tip = el('tooltip');
  const show = (event) => {
    tip.replaceChildren(...String(content).split('\n').map((line, i) => {
      const div = node('div');
      div.textContent = line;
      if (i === 0) div.style.fontWeight = '750';
      return div;
    }));
    tip.classList.add('visible');
    tip.setAttribute('aria-hidden', 'false');
    const box = target.getBoundingClientRect();
    const x = (event?.clientX ?? box.left + box.width / 2);
    tip.style.left = `${Math.min(window.innerWidth - 12 - tip.offsetWidth, Math.max(12, x - tip.offsetWidth / 2))}px`;
    tip.style.top = `${Math.max(8, box.top - tip.offsetHeight - 8)}px`;
  };
  const hide = () => {
    tip.classList.remove('visible');
    tip.setAttribute('aria-hidden', 'true');
  };
  target.addEventListener('mouseenter', show);
  target.addEventListener('mousemove', show);
  target.addEventListener('mouseleave', hide);
  target.addEventListener('focus', show);
  target.addEventListener('blur', hide);
}

/* ---------- helpers ---------- */

function node(tag, className) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  return n;
}

function text(tag, className, content) {
  const n = node(tag, className);
  n.textContent = content;
  return n;
}

function numCell(content) {
  return text('td', 'num', content);
}

function formatDay(key) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

function weekdayInitial(key) {
  return new Date(`${key}T12:00:00Z`)
    .toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' });
}

function formatHour(h) {
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${suffix}`;
}

el('window-select').addEventListener('change', () => load().catch(showError));
el('cover-select').addEventListener('change', () => load().catch(showError));

el('limit-select').addEventListener('change', async (event) => {
  const value = event.target.value;
  try {
    await patch('/api/settings', { daily_total_limit: value === '' ? null : Number(value) });
    await load();
  } catch (err) {
    // Put the control back where it was rather than lying about the saved value.
    event.target.value = state.report?.dailyTotalLimit ?? '';
    if (err.message !== 'Cancelled.') alert(err.message);
  }
});

function showError(err) {
  el('tiles').replaceChildren(text('p', 'error', `Could not load the report. ${err.message}`));
}

load().catch(showError);

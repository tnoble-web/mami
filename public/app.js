/**
 * Fridge check-in, phone-first.
 *
 * Design rule throughout: one tap to log a drink, and never block anyone from
 * taking one. A hard block just moves consumption off the books.
 */

import { fridgeMascot, moodForDrinks } from './mascot.js';

const STORE_KEY = 'fridge.person';

const state = {
  me: null,        // { id, name }
  drinks: [],
  people: [],
  myToday: 0,
  byDrinkToday: {},
  fridgeToday: 0,
  dailyLimit: null, // drinks per person per day, all kinds counted together
};

const el = (id) => document.getElementById(id);
const screens = { who: el('screen-who'), fridge: el('screen-fridge') };

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let payload = {};
  try { payload = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw Object.assign(new Error(payload.error || `Request failed (${res.status})`), { payload });
  return payload;
}

/* ---------- boot ---------- */

async function boot() {
  const saved = readSaved();
  await refresh(saved?.id);
  // A remembered person who no longer exists (fresh database) falls back to the picker.
  if (saved && state.people.some((p) => p.id === saved.id)) {
    state.me = saved;
    showFridge();
  } else {
    clearSaved();
    showWho();
  }
}

function readSaved() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && Number.isFinite(parsed.id) ? parsed : null;
  } catch { return null; }
}

function saveMe(person) {
  state.me = { id: person.id, name: person.name };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state.me)); } catch { /* private mode */ }
}

function clearSaved() {
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
}

async function refresh(personId = state.me?.id) {
  const query = personId ? `?person_id=${encodeURIComponent(personId)}` : '';
  const data = await api(`/api/state${query}`);
  state.drinks = data.drinks;
  state.people = data.people;
  state.myToday = data.me?.today ?? 0;
  state.byDrinkToday = data.me?.byDrinkToday ?? {};
  state.fridgeToday = data.totals?.today ?? 0;
  state.dailyLimit = data.dailyLimit ?? null;
  if (data.me && state.me) state.me.name = data.me.name;
  renderAll();
}

/* ---------- screens ---------- */

function showWho() {
  screens.who.hidden = false;
  screens.fridge.hidden = true;
  el('who-chip').hidden = true;
  renderPeople();
}

function showFridge() {
  screens.who.hidden = true;
  screens.fridge.hidden = false;
  const chip = el('who-chip');
  chip.hidden = false;
  chip.textContent = state.me?.name ?? '';
  renderAll();
}

function renderAll() {
  renderMascot();
  renderPeople();
  renderDrinks();
  renderSummary();
  renderRestockOptions();
  const chip = el('who-chip');
  if (state.me) chip.textContent = state.me.name;
}

/**
 * The logo doubles as a status light: it pulls a face from the current stock
 * levels, so the header says something true as well as being friendly.
 */
function renderMascot() {
  const mood = moodForDrinks(state.drinks);
  const logo = el('logo-mascot');
  if (logo) logo.innerHTML = fridgeMascot(mood, 34);

  // A bigger, glummer one fronts the "nothing in the fridge" state.
  const art = el('empty-art');
  if (!art) return;
  const unstocked = state.drinks.length > 0 && state.drinks.every((d) => d.stock <= 0);
  art.hidden = !unstocked;
  art.innerHTML = unstocked ? fridgeMascot('sad', 96) : '';
}

function renderPeople() {
  const list = el('people-list');
  if (!list) return;
  list.replaceChildren(...state.people.map((p) => {
    const btn = document.createElement('button');
    btn.className = 'person-chip';
    btn.textContent = p.name;
    btn.addEventListener('click', () => {
      saveMe(p);
      refresh(p.id).then(showFridge);
    });
    return btn;
  }));
  list.hidden = state.people.length === 0;
}

function renderSummary() {
  const mine = state.myToday;
  const limit = state.dailyLimit;

  // Showing progress against the limit ("1 of 2 today") does the reminding on
  // its own, before anyone has to be told they're over. The headline stays short
  // enough for one line on a phone; the detail goes underneath it.
  if (limit === null) {
    el('my-count').textContent = mine === 0
      ? 'Nothing logged today'
      : `${mine} drink${mine === 1 ? '' : 's'} today`;
  } else {
    el('my-count').textContent = `${mine} of ${limit} today`;
  }

  const sub = [];
  if (limit !== null && mine > limit) sub.push(`Over your limit of ${limit}.`);
  else if (limit !== null && mine === limit) sub.push("That's your limit for today.");
  sub.push(state.fridgeToday === 0
    ? 'Be the first to log one today.'
    : `${state.fridgeToday} taken from the fridge today.`);
  el('fridge-count').textContent = sub.join(' ');

  // A fresh install knows the drink list but not what's physically on the shelf,
  // so every card reads empty until someone enters the starting counts once.
  const unstocked = state.drinks.length > 0 && state.drinks.every((d) => d.stock <= 0);
  el('setup-hint').hidden = !unstocked;
}

function renderDrinks() {
  const grid = el('drink-grid');
  if (!grid) return;

  grid.replaceChildren(...state.drinks.map((d) => {
    const mineToday = state.byDrinkToday[d.id] ?? 0;
    const card = document.createElement('button');
    card.className = `drink-card status-${d.status}`;
    card.setAttribute('role', 'listitem');
    card.disabled = false;

    const emoji = document.createElement('span');
    emoji.className = 'drink-emoji';
    emoji.textContent = d.emoji;
    emoji.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'drink-name';
    name.textContent = d.name;

    const meta = document.createElement('span');
    meta.className = 'drink-meta';
    meta.textContent = stockLabel(d);

    card.append(emoji, name, meta);

    if (mineToday > 0) {
      const badge = document.createElement('span');
      badge.className = 'drink-badge';
      badge.textContent = `you: ${mineToday}`;
      if (d.daily_limit !== null && mineToday >= d.daily_limit) badge.classList.add('at-limit');
      card.append(badge);
    }

    card.setAttribute('aria-label',
      `${d.name}, ${stockLabel(d)}${mineToday ? `, you've had ${mineToday} today` : ''}`);
    card.addEventListener('click', () => takeDrink(d, card));
    return card;
  }));

  if (!state.drinks.length) {
    const empty = document.createElement('p');
    empty.className = 'footnote';
    empty.textContent = 'No drinks configured yet. Add some from the fridge report.';
    grid.replaceChildren(empty);
  }
}

function stockLabel(d) {
  if (d.status === 'out') return 'empty';
  if (d.stock <= 3) return `${d.stock} left`;
  if (d.status === 'low') return `${d.stock} left · running low`;
  return `${d.stock} in stock`;
}

/* ---------- logging a drink ---------- */

async function takeDrink(drink, card) {
  card.disabled = true;
  card.classList.add('tapped');
  try {
    let result = await api('/api/takes', {
      method: 'POST',
      body: { person_id: state.me.id, drink_id: drink.id, qty: 1 },
    });

    // Server says this take is over the person's soft daily limit: ask, don't refuse.
    if (result.needsConfirm) {
      const proceed = await confirmOverLimit(drink, result.limit);
      if (!proceed) {
        toast(`No ${drink.name}. Respect.`);
        return;
      }
      result = await api('/api/takes', {
        method: 'POST',
        body: { person_id: state.me.id, drink_id: drink.id, qty: 1, acknowledged: true },
      });
    }

    if (navigator.vibrate) navigator.vibrate(15);
    toastTake(drink, result);
    await refresh();
  } catch (err) {
    toast(err.message || 'Could not log that.');
  } finally {
    card.disabled = false;
    card.classList.remove('tapped');
  }
}

function toastTake(drink, result) {
  // Count the day's total, not this drink's: the limit people are held to is
  // "two drinks", not "two Monsters".
  const n = result.takenTodayTotal ?? result.takenToday;
  const parts = [`${drink.emoji} ${drink.name} logged`];

  if (result.limit?.overLimit) parts.push(`${ordinal(n)} today, over your limit`);
  else if (result.limit?.remaining === 0) parts.push(`${ordinal(n)} today, that's your limit`);
  else if (n > 1) parts.push(`${ordinal(n)} today`);

  if (result.lowStock === 'out') parts.push('that was the last one in the fridge');
  else if (result.lowStock === 'low') parts.push(`only ${result.drink.stock} left`);

  toast(parts.join(' · '), { undo: true });
}

function confirmOverLimit(drink, limit) {
  const sheet = el('confirm-sheet');
  // The house rule counts drinks, not kinds — so say "another drink", not
  // "another Monster", when that's the rule being crossed.
  el('confirm-title').textContent = limit?.scope === 'day'
    ? 'Take another drink?'
    : `Another ${drink.name}?`;
  el('confirm-body').textContent = limit?.message
    || `You're over your daily limit for ${drink.name}.`;
  sheet.showModal();
  return new Promise((resolve) => {
    sheet.addEventListener('close', () => resolve(sheet.returnValue === 'confirm'), { once: true });
  });
}

/* ---------- toast + undo ---------- */

let toastTimer = null;

function toast(text, { undo = false } = {}) {
  const box = el('toast');
  el('toast-text').textContent = text;
  const undoBtn = el('toast-undo');
  undoBtn.hidden = !undo;
  box.hidden = false;
  box.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undo ? 6000 : 3000);
}

function hideToast() {
  const box = el('toast');
  box.classList.remove('visible');
  setTimeout(() => { box.hidden = true; }, 200);
}

el('toast-undo').addEventListener('click', async () => {
  try {
    const result = await api('/api/takes/undo', {
      method: 'POST',
      body: { person_id: state.me.id },
    });
    toast(`Removed that ${result.drink.name}.`);
    await refresh();
  } catch (err) {
    toast(err.message || 'Could not undo.');
  }
});

/* ---------- restock ---------- */

function renderRestockOptions() {
  const select = el('restock-drink');
  if (!select) return;
  const previous = select.value;
  select.replaceChildren(...state.drinks.map((d) => {
    const opt = document.createElement('option');
    opt.value = String(d.id);
    opt.textContent = `${d.emoji} ${d.name} (app says ${d.stock})`;
    return opt;
  }));
  if (previous) select.value = previous;
}

el('restock-btn').addEventListener('click', () => {
  el('restock-error').hidden = true;
  el('restock-sheet').showModal();
});

el('restock-sheet').addEventListener('click', (event) => {
  if (event.target.dataset.close !== undefined) el('restock-sheet').close();
});

el('restock-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorBox = el('restock-error');
  errorBox.hidden = true;
  const counted = el('restock-counted').value;
  try {
    const result = await api('/api/restocks', {
      method: 'POST',
      body: {
        drink_id: Number(el('restock-drink').value),
        qty_added: Number(el('restock-qty').value || 0),
        counted_before: counted === '' ? null : Number(counted),
        person_id: state.me?.id ?? null,
      },
    });
    el('restock-sheet').close();
    const bits = [`${result.drink.name} is now ${result.drink.stock}`];
    if (result.unlogged > 0) bits.push(`${result.unlogged} went unlogged since the last count`);
    toast(bits.join(' · '));
    await refresh();
  } catch (err) {
    errorBox.textContent = err.message || 'Could not save that.';
    errorBox.hidden = false;
  }
});

/* ---------- identity ---------- */

el('new-person-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = el('new-person-name');
  const errorBox = el('who-error');
  errorBox.hidden = true;
  const name = input.value.trim();
  if (!name) return;
  try {
    const { person } = await api('/api/people', { method: 'POST', body: { name } });
    saveMe(person);
    input.value = '';
    await refresh(person.id);
    showFridge();
  } catch (err) {
    errorBox.textContent = err.message || 'Could not add that name.';
    errorBox.hidden = false;
  }
});

el('who-chip').addEventListener('click', () => {
  clearSaved();
  state.me = null;
  showWho();
});

function ordinal(n) {
  const suffix = (n % 100 >= 11 && n % 100 <= 13) ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th');
  return `${n}${suffix}`;
}

// Someone else's phone may have taken the last Monster while this page sat open.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.me) refresh().catch(() => {});
});

boot().catch((err) => {
  document.getElementById('app').innerHTML =
    `<p class="error">Could not reach the fridge server. ${escapeHtml(err.message || '')}</p>`;
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

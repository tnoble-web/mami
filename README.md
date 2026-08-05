# mami

A check-in tool for the office drink fridge. Scan the QR code on the fridge door,
tap what you took, done in about two seconds. In return you get a report that
says exactly what to buy and how much, before the fridge runs dry.

Zero dependencies — just Node 22 and its built-in SQLite.

## Why it works this way

Two rules shaped every design decision:

**Logging has to be faster than not logging.** No app to install, no account, no
login. One tap for your name (remembered on your phone), one tap for the drink.
That's the whole flow.

**Nothing ever blocks you from taking a drink.** Daily limits are nudges: go over
and it asks "another Monster?", and if you say yes it records it and moves on. A
hard cap would just push people to take drinks without logging them, which
destroys the only data that makes restocking work. An honest overage beats a
clean-looking number that's wrong.

## Running it

```bash
npm start                     # http://localhost:8080
```

Put it on any always-on machine on the office network — a spare Mac mini, a NUC,
a small VPS. Then:

```bash
MAMI_BASE_URL=http://fridge.office.example:8080 npm start
```

Setting `MAMI_BASE_URL` matters: it's the address baked into the QR code, and a
phone can't resolve `localhost`. Open `/print`, print the sheet, tape it to the
fridge at eye level.

The startup banner also prints the QR code straight into your terminal, so you
can scan it to test without printing anything.

On first run the app knows the drink list but not what's physically on the
shelves, so everything reads "empty" until someone enters the starting counts —
tap **I restocked the fridge** once per drink and you're set. The check-in screen
says as much until you do.

| Page | What it's for |
|---|---|
| `/` | Phone check-in — the thing people actually use |
| `/dashboard` | What's running out, burn rates, what to buy |
| `/print` | The fridge sticker, ready to print |

### Configuration

| Variable | Default | Meaning |
|---|---|---|
| `MAMI_PORT` | `8080` | Port to listen on |
| `MAMI_HOST` | `0.0.0.0` | Interface to bind |
| `MAMI_DB` | `data/mami.db` | SQLite file; created on first run |
| `MAMI_TZ` | system zone | IANA timezone that defines "today" for the fridge |
| `MAMI_BASE_URL` | — | Public URL encoded into the QR code |
| `MAMI_WINDOW_DAYS` | `14` | Trailing days used to measure consumption |
| `MAMI_COVER_DAYS` | `10` | Workdays of stock a restock should cover |
| `MAMI_ADMIN_TOKEN` | — | If set, editing drinks requires this token |

Getting the timezone right matters more than it sounds: a 6pm drink has to count
toward Monday, not Tuesday-in-UTC.

### Try it with realistic data first

```bash
MAMI_DB=data/demo.db npm run seed
MAMI_DB=data/demo.db npm start
```

That fills a throwaway database with a month of plausible history — six people,
weekday-heavy demand, mid-morning and post-lunch peaks — so the dashboard has
something to show before anyone has used it. It refuses to touch a database
that already has real check-ins unless you pass `--force`.

## How the forecasting works

The point of the tool is answering "how much do we buy, and when," so the
numbers try hard not to lie:

- **Rates are per workday, not per calendar day.** Nobody drinks a Monster on
  Sunday. Averaging weekends in would understate weekday demand by ~40% and you'd
  keep under-buying. Weekend consumption is tracked, just reported separately.
- **Today is excluded from rates.** It's a partial day; including it would drag
  every average down all morning and spike it by close of business.
- **A new fridge isn't averaged over days it didn't exist.** The window is
  clamped to the first day with recorded activity, so two days of history reads as
  a two-day average, not a fortnight of mostly-zeroes.
- **"Runs out" skips weekends.** Ten workdays of stock on a Wednesday means two
  weeks away, not ten days.
- **Buy quantities round up to whole cases**, because that's how drinks are sold.

### Keeping the numbers honest

Every unlogged drink makes the stock count drift from reality. So when you
restock, the app asks how many were on the shelf *before* you refilled. That's
optional, but when you answer it:

- the physical count becomes ground truth and replaces the running tally, and
- the gap between expected and counted is recorded as unlogged drinks.

The dashboard surfaces that as an "unlogged" figure. It's the tool measuring its
own accuracy — if it climbs, the check-in habit is slipping and the buy
recommendations are getting soft.

## Layout

```
bin/mami.js          startup, terminal QR, LAN address detection
src/db.js            schema and the starter drink list
src/stats.js         all forecasting logic — pure functions, no I/O
src/server.js        HTTP API and static file serving
src/qr.js            QR encoder (byte mode, no dependencies)
public/              check-in app, dashboard, print sheet
scripts/seed-demo.js demo history generator
test/                unit and API tests
```

`src/stats.js` is deliberately I/O-free: rates, projections, shopping list, and
limit checks are plain functions over plain rows, which is why they can be tested
against fixed dates instead of "whatever today is."

## Tests

```bash
npm test
```

68 tests covering the forecasting rules, the API surface (including soft-limit
behaviour, undo, shelf counts, path traversal, and oversized bodies), and the QR
encoder.

The QR encoder is checked module-for-module against reference matrices captured
from an independent implementation, and every code it produces was confirmed to
decode back to its input with a real scanner. Mask *selection* isn't pinned to the
reference — picking a mask is a penalty-score optimisation, not a correctness
requirement, and two conforming encoders can legitimately choose differently.

## A note on access

There's no authentication on check-in, by design — an auth prompt would make
logging slower than not logging, and the threat model is "coworkers and a
fridge." Anyone who can reach the server can log a drink as anyone.

Two things follow from that: keep it on the office network rather than the public
internet, and set `MAMI_ADMIN_TOKEN` if you don't want everyone able to
reconfigure the drink list. Consumption is attributed by name, so treat the
dashboard as what it is — a shared record of who drinks what.

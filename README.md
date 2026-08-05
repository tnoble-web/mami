# Venue pages — No Greater Love Photography

Venue landing pages that target searches like **"Le Belvédère wedding
photographer"** — made by a couple who has already booked the venue and put
down a deposit. Highest-intent search there is, and almost nobody competes
for it.

This exists because the head term ("Ottawa wedding photographer") is
unwinnable for a new domain. The studios ranking there have ten years of
backlinks. Venue long-tail is the winnable fight.

## The one idea that matters

**Google cannot read your photographs. It reads words.**

A page of pretty pictures with a venue name on it does not rank. What ranks
is text a couple cannot get anywhere else: what the light does at 6:45pm,
where portraits work when it rains, how long the walk to the ceremony really
takes. That text is also what convinces them to hire you, because it reads
like someone who has stood on that property with a camera.

Which is why almost every field in a venue file asks for something specific
and verifiable, and why the checker refuses to let a vague page go live.

### The failure mode this guards against

Twenty pages that are the same page with a name swapped in is a pattern
Google calls a **doorway page**. It does not just fail to rank — it can drag
down every page on the domain. `npm run check:venues` compares your published
pages against each other and fails the run if a sentence appears on more than
one of them.

So: never invent a detail. A wrong claim about someone's venue is also the
fastest way to lose a coordinator who was sending you referrals. Leave a
field `null` instead — an omitted section looks fine, an invented one costs
you your credibility.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000/wedding-photographer
```

Open <http://localhost:3000/wedding-photographer/maplewood-barn> to see a
fully worked example page. **Maplewood Barn is fictional** — invented on
purpose so there was no chance of publishing made-up claims about a real
Ottawa property. It is there to show the standard to aim for. Keep it open
beside your own drafts.

## What to do first

1. **Fill in `config/business.ts`.** Everything about your business lives in
   that one file. Search it for `TODO`.
2. **Pick the venue you have shot the most** and finish its page.
   Specificity beats coverage — one excellent page ranks, six vague ones do
   not.
3. **Add your photographs** to `public/venues/<slug>/` and list them in the
   venue file with real pixel dimensions.
4. **Run `npm run check:venues`** and fix what it reports.
5. **Set `published: true`.** Only then does the page enter the sitemap and
   the venue index.

### Venues already scaffolded

All six have verified addresses and are `published: false`, waiting on your
first-hand content:

| Venue | Where | File |
| --- | --- | --- |
| Le Belvédère | Wakefield, QC | `content/venues/le-belvedere.ts` |
| Orchard View | Greely, ON | `content/venues/orchard-view.ts` |
| Canada Aviation and Space Museum | Ottawa, ON | `content/venues/canada-aviation-space-museum.ts` |
| Bean Town Ranch | Plantagenet, ON | `content/venues/bean-town-ranch.ts` |
| Sala San Marco | Ottawa, ON | `content/venues/sala-san-marco.ts` |
| Fairmont Château Laurier | Ottawa, ON | `content/venues/fairmont-chateau-laurier.ts` |

Do the rural ones first. Château Laurier is the most-photographed venue in
Ottawa, so that page has real competition; Bean Town Ranch and Orchard View
have almost none and will rank faster.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server. Drafts are previewable; in production they do not exist. |
| `npm run build` | Production build. |
| `npm run new:venue` | Scaffolds a new venue file and registers it. |
| `npm run check:venues` | Content checker. Exit code 1 if a **published** page has errors, so it can gate a deploy. Drafts only ever warn. |

## How publishing works

`published: false` means the page is kept out of the sitemap, out of the venue
index, and marked `noindex` — but still viewable in dev so you can write
against it. `published: true` puts it live.

Leaving a half-written page unpublished costs nothing. Publishing one teaches
Google that your venue URLs are thin, and that judgement is slow to reverse.

## The enquiry form

Every venue page ends with a form that arrives with the venue already filled
in. On submit:

1. The lead is **saved to disk first**, before any email is attempted —
   providers fail, and a lost enquiry is a lost wedding.
2. The couple gets an auto-reply that **answers the availability question
   immediately**, based on `bookedDates` in `config/business.ts`. Keep that
   list current: an instant honest yes-or-no converts far better than "let me
   check my calendar," and a wrong yes is worse than either.
3. You get a notification written to be readable on a phone lock screen.

The auto-reply promises a human reply within `humanReplyWithinHours`. **Keep
that promise** — response speed is the strongest single predictor of whether
a wedding enquiry converts, and a promise you miss is worse than one you
never made.

### Wedding show leads

Point a QR code on your booth signage and brochures at:

```
https://nogreaterlovephoto.com/inquire?source=wedding-show
```

Every lead from the show is then tagged `wedding-show`, so afterwards you can
actually tell what the booth earned you.

## Going live

### Email

Without configuration, every email is written to `.outbox/` as an HTML file
and logged — so the whole flow is testable before you sign up for anything.

To send for real, verify your domain with [Resend](https://resend.com) and
set:

```
RESEND_API_KEY=re_...
```

`fromEmail` in `config/business.ts` must be on the domain you verified.
Replies go to `replyToEmail`, so answers land in your normal inbox.

### Hosting — needs a decision

You said the site is on Cloudflare, which could mean two different things,
and they lead to different places:

**If nogreaterlovephoto.com is on Cloudflare Pages**, these pages can live on
the same domain, which is what you want — same-domain paths beat a subdomain,
because a subdomain does not fully share the main site's ranking strength.
Two things need doing:

- The lead store (`src/lib/store.ts`) writes to a JSON file, which needs a
  persistent disk. Cloudflare Pages does not have one. Either move the store
  to Cloudflare D1/KV — every read and write goes through that one file, so
  it is a contained change — or point the form at a form service and drop the
  store.
- `/api/inquiry` becomes a Cloudflare Pages Function rather than a Next.js
  route handler.

**If Cloudflare is only DNS in front of another host** (Squarespace, Wix,
WordPress), then honestly you may not want this app at all. Take the content
structure — the fields in `content/venues/types.ts` are the actual asset —
and write the pages in whatever you already use. You lose the automatic
sitemap, the structured data and the checker, but you keep the ~90% of the
value that comes from the words being on your domain.

Either way, the content you write transfers. Nothing you type into these
files is wasted if the hosting decision changes.

### After the first page is live

- Submit the sitemap in Google Search Console: `/sitemap.xml`.
- Validate the structured data with Google's Rich Results Test — each page
  emits `WebPage`, `Place`, `BreadcrumbList` and `FAQPage`.
- Expect **4–12 weeks** before these start ranking. That is normal for a new
  domain on low-competition long-tail, and it is why starting now matters
  more than starting perfectly.

## Layout

```
config/business.ts          Everything about your business. Edit this first.
content/venues/
  types.ts                  The content model, heavily commented on why each field exists
  _template.ts              Copy for a new venue (or use npm run new:venue)
  _example-maplewood-barn.ts  Fictional worked example — the standard to hit
  index.ts                  Registry. Auto-updated by npm run new:venue.
  <slug>.ts                 One file per venue
src/app/
  wedding-photographer/     The hub index and the [venue] page template
  inquire/                  Standalone enquiry page (also the wedding-show QR target)
  api/inquiry/              Form endpoint
  sitemap.ts robots.ts      Published venues only
src/lib/
  venues.ts                 Loading, publishing rules, alias matching
  seo.ts                    Metadata and JSON-LD
  dateInfo.ts               Availability and date intelligence (all UTC, on purpose)
  templates.ts              Email copy
  store.ts                  Lead storage — the one file to change for a real database
  mailer.ts                 Resend, or .outbox/ when unconfigured
scripts/
  new-venue.mjs             Scaffolder
  check-venues.ts           Content checker
```

## What is not here yet

The lead pipeline (stages, notes, follow-up nudges) is modelled in
`src/lib/types.ts` and stored, but there is no admin UI and nothing sends the
follow-ups. Most enquiries that go cold do so because nobody followed up
twice, so that is the highest-value thing to add next — but venue pages come
first, because they need months of runway and the follow-ups do not.

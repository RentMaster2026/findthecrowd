# Find the Crowd

Live crowd reports for Ottawa nightlife and events. findthecrowd.com

One question: where should we go right now? People already out report what a
place is actually like, everyone else sees what that adds up to, and a group can
send each other a shortlist and vote on it without anyone making an account.

Three jobs, which is also the navigation: **Explore**, **Saved**, **Update**.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database or API key is needed to start. In
development the app serves a generated Ottawa so the screens are not empty, and
labels it as demo data on every screen that shows it.

Crowd data is time-of-day data, so at 2pm on a Tuesday the honest answer is
"nobody has reported anything". Add `?at=peak` to any URL to wind the clock to
Saturday 11pm. It is ignored once a database is connected.

`NEXT_PUBLIC_DEMO_DATA=0 npm run dev` turns the generator off, which is how to
look at the real empty state. That state is a designed screen, not a fallback,
so it is worth looking at.

**A production build never generates data.** With no database it shows an honest
empty directory. One misconfigured deploy cannot publish invented crowd reports
under a real domain.

```
npm run build     production build
npm test          time, scoring, events, hours, shortlists, report API
npm run seed      load venues into Supabase
```

To put this live on findthecrowd.com, follow `DEPLOY.md`. It covers GitHub,
Vercel, Supabase and DNS step by step.

## The Vibe Score

The number on every card is the percentage of people who answered yes to one
question: would you tell a mate to come here right now?

It is a headcount, not a star rating, which is what makes it checkable. The
rules, all of which live in `src/lib/score.ts` and are covered by tests:

It counts **people, not submissions**. A contributor's newest report replaces
their older one in the current aggregate, so reporting a venue ten times still
counts once.

| Rule | Value | Why |
| --- | --- | --- |
| Recommendation window | 6 hours | Older reports say nothing about right now |
| Half-life | 90 minutes | A report's weight halves this often |
| Crowd window | 60 minutes | How busy a room is does not keep |
| Queue window | 30 minutes | A door queue keeps even less well |
| Confidence floor | 4 distinct contributors | Below this it is labelled low signal |
| Report cooldown | 20 min per venue per device | Stops promoters and double taps |
| Device ceiling | 12 reports per hour | Stops one device flooding the city |

Four things stay separate on purpose, each with its own freshness window and its
own timestamp on screen:

- **Worth going** is whether people think it is worth being there.
- **Crowd** is how full the room is.
- **Queue** is the door.
- **Cover** is the price at that door.

A club can be rammed and score 30. Conflating those is how you end up
recommending a bad club with a long line. Missing reports are never rendered as
an empty room, a zero, or a verdict: a venue with no reports shows no number at
all.

Team and venue reports are stored with a `role`, labelled on screen, and kept
out of the public percentage entirely.

Feed ranking is not a sort by score. A 100% from two people loses to an 84% from
fifteen, because the score is shrunk toward 50 by a Bayesian prior weighted by
sample size, then boosted for freshness. See `rankValue`.

## Connecting the database

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor, then
   `supabase/migrations/002_shortlists_and_corrections.sql`. Together they
   create the tables, the row-level security policies, the cooldown triggers,
   group shortlists, corrections, and the scheduled retention job.
   `pg_cron` must be enabled or the 30-day deletion is not actually running;
   migration 002 prints a notice if it is missing. See `docs/PILOT.md`.
3. `cp .env.example .env.local` and fill in the URL, anon key and service role
   key.
4. `npm run seed` to load the venues and a fortnight of events.

The moment the env vars exist, every read and write goes to Postgres and the
simulated data is never used again. Nothing else changes.

Reporting deliberately requires no account. Waze's contribution loop works
because reporting costs nothing; a sign-up wall before the first report kills the
only data source this product has. Each device holds a random id in
localStorage, used for the cooldown and nothing else. Saved places and group
votes use separate ids that are never joined to reports. Reports are deleted
after 30 days by a scheduled database job.

## Layout

```
src/
  app/
    page.tsx            Explore. Now / Tonight, search, filters, empty state
    v/[slug]/page.tsx   Venue page, score, reports, what's on
    saved/page.tsx      Saved places, and "ask the group"
    g/[code]/page.tsx   A shared shortlist. Anonymous voting, noindex, expires
    report/page.tsx     Pick a venue, then the report sheet
    corrections/page.tsx  A correction form that actually receives things
    events/page.tsx     Seven nights of checked Ottawa events
    guides/             Ottawa guide pages, written for search
    sitemap.ts          Every page, for Google Search Console
    robots.ts           Crawl rules
    opengraph-image.tsx The picture a pasted link shows
    about/page.tsx      How the score works, in plain words
    api/reports/route.ts      Server-side validation, the real boundary
    api/shortlists/**         Create a shortlist, cast and change votes
    api/corrections/route.ts  Receives corrections
  lib/
    time.ts             Ottawa time. Instants, nights, DST. Read this first
    score.ts            The scoring engine. Pure, tested, injectable clock
    hours.ts            Open / opens later / unconfirmed, from sourced hours
    saved.ts            Saved places and the voter id, both local to a browser
    analytics.ts        Event names chosen so they cannot flatter the product
    store/              Data layer. Screens never touch Supabase directly
      index.ts            Public API: getExplore, getVenueDetail, submitReport,
                          shortlists, corrections, getCoverage
      supabase.ts         Postgres adapter
      synthetic.ts        Demo generator, only when no database is configured
    types.ts            Domain types
    labels.ts           Every user-facing string for enums, in one place
    seo.ts              Titles, canonicals, structured data
  data/
    venues.ts           41 Ottawa venues and restaurants across nine areas
    guides.ts           Guide content. Plain text, no CMS needed yet
    events.ts           VERIFIED events only. Every one carries a source URL
    events.sample.ts    Unverified fixtures. Development and preview only
    editorial.ts        The empty state's picks, drawn from the guides
    data.test.ts        Guards: no broken venue links, no stale copy
supabase/schema.sql     Tables, RLS, cooldown triggers, retention
supabase/migrations/    002: roles, event provenance, shortlists, corrections
docs/PILOT.md           How to run the Ottawa pilot and what would prove it
docs/DATA-CHANGES.md    Every listing corrected, demoted or deleted, and why
scripts/seed.ts         Loads venues into Supabase
```

`src/lib/store/index.ts` is the seam. When real event feeds and a venue table
arrive, that file changes and no screen does.

## Design rules

Solid colours, no gradients, no glass, no glow. Borders separate things, not drop
shadows. One accent, used for the brand, the live state and the primary action.
Numbers are the loudest thing on screen.

Contrast is measured, not eyeballed. Three pairs failed WCAG 2.2 AA for normal
text and are fixed in `globals.css` without changing the brand orange: the
dimmest text colour, the ink on the accent (near-black rather than white, which
was 3.57:1), and the lowest score band. Interactive targets are 44 to 48px,
focus is visible everywhere, and the report sheet traps focus, closes on Escape
and returns focus to the control that opened it.

## Before launch

- [ ] Verify the venue list. Names and addresses come from public Ottawa
      listings. Coordinates are block-level approximations, good enough to
      cluster on a map and not good enough to navigate to. Geocode them properly
      and confirm every venue is still trading. Nightlife listings go stale fast.
- [ ] Replace the event templates in `src/data/events.ts` with real feeds or
      venue submissions. Keep the `source` field populated: every card shows its
      attribution and that is not optional.
- [ ] Solve the cold start. The score needs 4 reports per venue per night to
      mean anything. Decide which 10 venues and which 2 nights you are seeding by
      hand, in person, before you tell anyone the app exists.
- [ ] Schedule `prune_old_reports()` with pg_cron.
- [ ] Write the moderation path for a venue disputing its score. There will
      be one in the first month.
- [ ] Add venue claiming, confirm/dispute buttons on individual reports, and
      push notifications.

## Search

Nobody searches "Find the Crowd". They search "bars in ottawa tonight" and
"where to go out in ottawa". The guide pages are written for those searches and
they have something the listicles ranking for them today do not: a live number
next to every place, which updates itself every time somebody reports.

Every page has its own title, description and canonical URL. Venue pages carry
Restaurant or BarOrPub structured data, and the rating is only marked up when
there are enough reports to defend it. Guides carry Article and FAQ markup, so
the questions at the bottom can win their own result.

`NEXT_PUBLIC_SITE_URL` must be the real domain in production or every canonical
tag points at the wrong place. `DEPLOY.md` covers it.

## Mobile

No web fonts, so text paints on the first frame. Cards reserve their height, so
nothing jumps when data lands. Offscreen cards are skipped during paint. Route
changes show skeletons the same size as the real cards. The four main routes are
prefetched. Sheets contain their own scrolling so the feed does not move behind
them. Inputs are 16px so iOS does not zoom on focus.

Above 900px the bottom tab bar becomes a left rail and the feed goes to two
columns. Same components, different arrangement.

## The map

Removed for the MVP. Venue coordinates are still in the data and the geocoding
note still stands, so adding it back later is a component and a route, not a
data migration.

# Find the Crowd

Live crowd reports for Ottawa nightlife and events. findthecrowd.com

People already out report what a place is actually like right now. Everyone else
sees a single number per venue and knows whether to walk over.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database or API key is needed to start: with no
Supabase credentials the app serves a simulated Ottawa so the screens are never
empty.

Crowd data is time-of-day data, so at 2pm on a Tuesday the honest answer is
"nobody has reported anything" and the app says so. To see a full weekend, add
`?at=peak` to any URL. That switch is ignored once a real database is connected.

```
npm run build     production build
npm test          scoring and data tests
npm run seed      load venues and events into Supabase
```

To put this live on findthecrowd.com, follow `DEPLOY.md`. It covers GitHub,
Vercel, Supabase and DNS step by step.

## The Vibe Score

The number on every card is the percentage of people who answered yes to one
question: would you tell a mate to come here right now?

It is a headcount, not a star rating, which is what makes it checkable. The
rules, all of which live in `src/lib/score.ts` and are covered by tests:

| Rule | Value | Why |
| --- | --- | --- |
| Scoring window | 6 hours | Older reports say nothing about right now |
| Half-life | 90 minutes | A report's weight halves this often |
| Confidence floor | 4 reports | Below this the score is greyed and labelled |
| Report cooldown | 20 min per venue per device | Stops promoters and double taps |
| Device ceiling | 12 reports per hour | Stops one device flooding the city |

Two things stay separate on purpose:

- Score is whether people think it's worth being there.
- Crowd is how full the room is.

A club can be rammed and score 30. Conflating those is how you end up
recommending a bad club with a long line.

Feed ranking is not a sort by score. A 100% from two people loses to an 84% from
fifteen, because the score is shrunk toward 50 by a Bayesian prior weighted by
sample size, then boosted for freshness. See `rankValue`.

## Connecting the database

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor. It creates the tables, the
   row-level security policies, the cooldown triggers and the retention job.
3. `cp .env.example .env.local` and fill in the URL, anon key and service role
   key.
4. `npm run seed` to load the venues and a fortnight of events.

The moment the env vars exist, every read and write goes to Postgres and the
simulated data is never used again. Nothing else changes.

Reporting deliberately requires no account. Waze's contribution loop works
because reporting costs nothing; a sign-up wall before the first report kills the
only data source this product has. Each device holds a random id in
localStorage, used for the cooldown and nothing else. Reports are deleted after
30 days.

## Layout

```
src/
  app/
    page.tsx            Tonight feed, ranked
    v/[slug]/page.tsx   Venue page, score, reports, what's on
    report/page.tsx     Pick a venue, then the report sheet
    events/page.tsx     Seven days of Ottawa events
    guides/             Ottawa guide pages, written for search
    sitemap.ts          Every page, for Google Search Console
    robots.ts           Crawl rules
    opengraph-image.tsx The picture a pasted link shows
    about/page.tsx      How the score works, in plain words
    api/reports/route.ts  Server-side validation, the real boundary
  lib/
    score.ts            The scoring engine. Pure, tested, injectable clock
    score.test.ts       scoring tests
    store/              Data layer. Screens never touch Supabase directly
      index.ts            Public API: getTonight, getVenueDetail, submitReport
      supabase.ts         Postgres adapter
      synthetic.ts        Demo generator, only when no database is configured
    types.ts            Domain types
    labels.ts           Every user-facing string for enums, in one place
    seo.ts              Titles, canonicals, structured data
    clock.ts            Time formatting that respects the Ottawa timezone
  data/
    venues.ts           41 Ottawa venues and restaurants across nine areas
    guides.ts           Guide content. Plain text, no CMS needed yet
    events.ts           Weekly event templates, expanded against today
    data.test.ts        Guards: no broken venue links, no stale copy
supabase/schema.sql     Tables, RLS, cooldown triggers, retention
scripts/seed.ts         Loads venues and events into Supabase
```

`src/lib/store/index.ts` is the seam. When real event feeds and a venue table
arrive, that file changes and no screen does.

## Design rules

Solid colours, no gradients, no glass, no glow. Borders separate things, not drop
shadows. One accent, used for the brand, the live state and the primary action.
Numbers are the loudest thing on screen.

The red flag on a card is the loudest element in the app, so it stays rare: a
venue earns it only by being live, confidently scored above 85 and busy, and at
most three can hold it at once. If everything is flagged, nothing is.

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

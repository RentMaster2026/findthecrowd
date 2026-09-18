# Delivery report

Branch: `mvp-honest-discovery`. One commit on top of `main`.

Two claims, kept separate on purpose:

- **The software is ready to pilot.** It builds, the checks pass, everything it
  displays is either sourced or visibly labelled as unsourced, and it behaves
  honestly with zero reports.
- **The business is not validated.** Nothing here demonstrates demand, retention
  or coverage. Those are the experiments this MVP exists to make possible, and
  the gates for them are in `docs/PILOT.md`.

---

## What changed, and why

### 1. Time was the root cause of the date bugs

Every date calculation used `Date#getHours`, `getDay` and `toDateString`, which
read the **server's** timezone. Vercel runs in UTC, so after 8pm Ottawa time the
server had already rolled over to the next calendar day. That single fact
produced all three symptoms in the audit: Friday's event on Thursday's homepage,
the venue page calling the same event "Tmrw" while the homepage called it
"Today", and the events page emitting three headings for two dates plus a
trailing "undated" group.

`src/lib/time.ts` is now the only place dates are computed. Instants are UTC
underneath; wall-clock time exists only relative to `America/Toronto`, resolved
through `Intl`. A **night** runs 5am to 5am, so a 12:30am set belongs to the
night before — and the real calendar date is printed next to every relative word
like "tonight", so a relative word can never hide a date again.

22 tests cover it, including both DST transitions, the midnight rollover, and
the exact production failure (11:35pm Thursday in Ottawa, when the server thinks
it is Friday).

### 2. Event provenance

The weekly `REDBLACKS home game` at TD Place was not a stale listing, it was a
fabricated one: a template that generated a home game **every Saturday**. The
2026 schedule has Ottawa away at Calgary on Sept 19 and one home date on Sept 26.
Deleted, and replaced with the real Sept 26 fixture carrying a source URL and an
**unknown** ticket price rather than an invented one.

Events now require a source URL, a label and a checked-at date, rendered as a
link a reader can follow. The other 27 weekly templates are preserved as
unverified fixtures that cannot render in production, so they can be verified and
promoted rather than retyped. Full record in `docs/DATA-CHANGES.md`.

### 3. Scoring counts people

It counted submissions. It now counts **distinct contributors**, with a
contributor's newest report superseding their older one, so reporting a venue
twenty times still counts as one person — there is a test for exactly that.

Recommendation, crowd, queue and cover are now separate facts with separate
freshness windows (6h / 60m / 30m / 6h) and each carries its age on screen. A
90-minute-old queue reading is no longer a queue reading. Disagreement is
surfaced rather than averaged into a confident-looking middle. Venue and team
reports are stored with a role, labelled, and kept out of the public percentage.

Comparative claims are gated on evidence, so the report picker's "Busiest right
now" over a city with no reports is now "Choose a venue".

### 4. Empty states are a screen, not a fallback

A **production build with no database no longer generates data at all**. The old
code fell back to the report generator whenever env vars were missing, which
meant one misconfigured deploy could have published fabricated crowd data under
a real domain.

With no reports, the homepage shows checked events, a short editorial list
explicitly labelled as opinion rather than data, and an invitation to be the
first to report — instead of 41 unknown-score tiles. Missing reports are never
rendered as a zero, an empty room, or a verdict.

### 5. Discovery, reporting, sharing, deciding

Three destinations (Explore, Saved, Update), a Now/Tonight switch, compact
search and filters held in the URL so a filtered view is shareable and Back
restores it. Restaurants moved out of the nightlife feed into secondary
navigation, keeping their pages and their guide.

The report sheet is visually short: two questions, then the send button, with
everything optional behind a collapsed control. Success appears only after the
server accepts; a failure keeps every answer.

Share uses the native sheet with a working copy fallback, canonical deep links,
and an "as of" timestamp on any crowd claim. Saved is local. A shortlist link
lets friends vote without registering; votes live in their own table, expire
after 14 hours, are noindexed, and can never enter a crowd aggregate.

### 6. Claims reconciled with the code

`/about` described a confirm/dispute feature with no interface and a 30-day
deletion that nothing ran. It now says plainly that confirm/dispute is not built,
that there is no presence verification, and migration 002 actually schedules the
retention job. Every number on the page is interpolated from the constant the
engine uses, so the copy cannot drift from the code again.

### 7. Accessibility

The three failing colour pairs were measured and fixed **without changing the
brand orange**: dim text 3.84:1 → 5.73:1, white-on-accent 3.57:1 → near-black on
the same orange at 5.55:1, lowest band 3.60:1 → 5.70:1. Plus visible focus
everywhere (there was none), a skip link, 44–48px targets including the 34px
close control, and a report sheet that traps focus, closes on Escape and returns
focus to the control that opened it.

---

## Checks that actually ran

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean |
| `npm run build` | Compiles, 25 routes |
| `npm test` (vitest) | **112 passed**, up from 35 |
| `npm run test:e2e` (Playwright) | **27 of 27 passed** |
| Horizontal overflow at 360 / 390 / 430 / 768 / 1280 | None on any page |
| Contrast | Computed with the WCAG formula, not estimated |

Unit coverage added for: Ottawa instants and both DST transitions, night
windows and midnight crossing, a next-day event never rendering as tonight,
ended events, contributor de-duplication, no reports / one report / conflicting
/ expired states, separate freshness windows, non-independent reports, ranking
under small samples, opening-hours states, shortlist creation, vote replacement,
duplicate limits, expiry, input validation, group votes never entering crowd
aggregates, and the report API's validation, cooldown and hourly limit.

Browser checks confirmed in a real Chromium: the submit button sits above the
optional details, details are collapsed by default, focus is trapped across 40
tabs, Escape returns focus to the opener, success appears only after server
acceptance, cooldown reports accurately with no false success, a shortlist opens
and accepts a vote in a **fresh anonymous context**, changing a vote replaces it,
the correction form receives and confirms, and filter state survives back
navigation.

### What was not tested

- **No physical phone.** All mobile results are Chromium device emulation at the
  specified CSS widths. Emulation does not prove real iOS Safari behaviour,
  particularly the software keyboard against the bottom sheet.
- **No Lighthouse score, no user testing, no conversion data.** None was run, so
  none is quoted.
- **The Supabase path is unexercised.** No credentials were available, so every
  test ran against the in-memory fallback. The SQL is written and idempotent but
  has not been executed against a real Postgres.
- **The retention job has not been observed running.** It is scheduled by
  migration 002 and requires `pg_cron`.

---

## Remaining blockers

**Operational, needs credentials:**

1. Apply `supabase/migrations/002_shortlists_and_corrections.sql`. Until then
   group links and corrections return a specific 503 that names the missing
   migration — they do not fake success.
2. Confirm `pg_cron` is enabled, or the 30-day deletion on `/about` is not true.
3. Set `NEXT_PUBLIC_SITE_URL`, or share and shortlist links point at the wrong
   host.

**Data, needs a person in Ottawa:**

4. **No venue has verified opening hours**, so the whole directory says "hours
   unconfirmed". Honest, but not useful. Highest-value pre-launch task.
5. **The checked event list is three entries.** Twenty-seven candidates are
   waiting in `events.sample.ts` to be verified against venue pages.
6. **Rainbow Bistro's domain is parked for sale.** Confirm the venue still
   exists before listing it.
7. The REDBLACKS source is a Wikipedia season page because the official site
   blocks automated requests. Swap in the official schedule URL.

---

## The next real-world experiment

Not a feature. Coverage.

Pick **8 to 12 venues across ByWard Market and Elgin Street**, advertise
**Thursday to Saturday, 10pm to 1am, for three weekends**, and find out whether
at least 70% of them carry a report under an hour old during those windows.

Everything else is downstream of that answer. If a deliberately narrow, heavily
worked patch of one city cannot stay fresh for nine nights, no amount of product
work fixes it. If it can, the next question is whether people come back on a
later weekend — the gate that actually decides whether this is a product or a
novelty.

Full plan, denominators and thresholds in `docs/PILOT.md`.

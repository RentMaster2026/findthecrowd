# Ottawa pilot: running it, and deciding what it means

This is the operator's document. It covers what to set up before the first
night, how to get real coverage without faking it, what to measure, and the
thresholds that would tell you to keep going or stop.

Every number in the "decision gates" section is a **proposed target for a test
that has not been run**. None of them is a benchmark, an industry norm, or
something this product has achieved. Treat them as the bet you are placing, and
let the actual results move them.

---

## 1. Before the first night

### Required

| Step | Why |
|---|---|
| Run `supabase/schema.sql` in the Supabase SQL editor | Creates venues, events, crowd reports, votes, rate limiting, RLS |
| Run `supabase/migrations/002_shortlists_and_corrections.sql` | Adds report roles, event provenance columns, group shortlists, corrections, and the retention schedule |
| Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel | Without these the site has no database. It will show an honest empty directory rather than invented data, but nobody can report anything |
| Set `NEXT_PUBLIC_SITE_URL=https://findthecrowd.com` | Canonical URLs, share links and shortlist links are built from this |
| `npm run seed` | Loads the venue directory into Postgres |

### Verify, do not assume

These are the things that are claimed on `/about` and need to actually be true
on your deployment:

- **`pg_cron` is enabled.** Migration 002 schedules the 30-day report deletion.
  If the extension is not available the migration prints a notice and the
  schedule is not created, which means the retention promise on `/about` is not
  being kept. Check with:
  ```sql
  select jobname, schedule from cron.job where jobname like 'findthecrowd%';
  ```
  Expect two rows. If there are none, enable pg_cron under Database →
  Extensions and re-run the migration.
- **The cooldown trigger fires.** Insert two reports for the same venue and
  reporter id inside 20 minutes directly in SQL. The second must raise
  `cooldown:`. The API checks this too, but the trigger is the real boundary.
- **A shortlist link opens in a private window.** If `/g/<code>` says group
  links are unavailable, migration 002 did not apply.
- **A correction lands in a row.** Submit one through `/corrections` and check
  `select * from corrections order by created_at desc limit 1`.

### Known gaps to close before launch

These are real holes, listed so they do not get forgotten:

1. **Opening hours are unverified for every venue.** The product currently tells
   every visitor "hours unconfirmed", which is honest but not useful. Collecting
   and sourcing hours for the pilot venues is the single highest-value data task
   before night one. The schema is `Venue.hours` in `src/lib/types.ts`.
2. **The verified event list is very thin.** Two recurring nights at House of
   TARG and one REDBLACKS home date. Everything else sits in
   `src/data/events.sample.ts` as unverified fixtures waiting to be checked
   against a venue's own page and promoted.
3. **The REDBLACKS source is a Wikipedia season page**, because
   ottawaredblacks.com refuses automated requests. Replace it with the official
   schedule or ticketing URL and update `checkedAt`.
4. **Rainbow Bistro's domain is parked for sale.** The venue may have closed or
   rebranded. Confirm in person before listing it.
5. **Confirm/dispute has storage and scoring but no interface.** `/about` says
   so plainly. Either build it or keep saying so.

---

## 2. Coverage: getting real reports

The experiment is whether a small, deliberately covered area can stay fresh
enough to be worth opening. That means concentrating, not spreading.

**Scope: 8 to 12 venues, ByWard Market and Elgin Street, three weekends.**
Those two areas are walkable end to end, which is what makes one person able to
cover several venues in a night.

**Advertised coverage window: Thursday, Friday and Saturday, 10pm to 1am.**
Promise those hours and no others. A product that is fresh when it says it will
be is worth more than one that is sometimes fresh at random.

### How coverage is allowed to happen

- **Visitors who report.** The point of the whole thing.
- **Local contributors** you recruit, who are out anyway.
- **You and anyone working on this**, reporting the venues you are physically
  in, using the `team` role so it is labelled and excluded from the public
  percentage.
- **Venue staff**, if they want to, using the `venue` role. Same rule: labelled,
  and outside the public number.

### How it is not

Do not create reports for venues nobody is standing in. Not to fill the map, not
for a screenshot, not "just for the first weekend". The entire value of this
product is that the number means someone was there, and there is no way to
un-ring that bell once the data is mixed.

If an incentive is ever tested, it pays for a **useful, truthful report** —
including "this place is dead, do not come" — and never for a positive verdict.
A reward for good scores buys you a dataset that means nothing.

### Design constraint

The product has to work when exactly one person has reported. It does: one
report renders as "One person said it's worth going 4 min ago. That's one
report, not a consensus." Check that this still reads well on night one, because
night one is what it will look like.

---

## 3. What to measure

Instrumented in `src/lib/analytics.ts`. The event names are deliberately literal
so a dashboard cannot flatter the product.

| Funnel | Events | Denominator |
|---|---|---|
| Find something | `explore_viewed` → `venue_detail_viewed` → `directions_clicked` or `source_link_clicked` | Sessions that reached Explore |
| Contribute | `report_started` → `report_submitted` | Reports started, i.e. the sheet opened |
| Share a place | `venue_share_attempted` → `share_sheet_opened` / `share_link_copied` → `referred_visit` | Share attempts |
| Decide as a group | `shortlist_created` → `referred_visit(via=group)` → `shortlist_vote_cast` | Shortlists created |
| Come back | `return_visit_browser` | Browsers seen on a previous night |

### What these events do not mean

- `share_sheet_opened` is **not** a share. The OS sheet closing tells us
  nothing about whether a link was sent; on several platforms a cancellation
  resolves rather than rejecting. Only `share_link_copied` is an observed
  completion.
- `directions_clicked` is **not** a visit. Somebody tapped a link to a map.
- `return_visit_browser` is **not** a returning user. It is an anonymous id in
  one browser's localStorage, cleared by a private window, a new phone or a
  cleared cache.
- `report_submitted` fires only after the server accepts, so the
  started→submitted ratio is a real completion rate.

### Coverage metric

The one that decides whether the product works:

> Share of pilot venues with a report under 60 minutes old, sampled during the
> advertised coverage window.

`getCoverage()` in `src/lib/store/index.ts` returns this. Sample it at 11pm and
again at midnight on each covered night rather than averaging over a whole day,
which would hide the thing you are trying to see.

---

## 4. Proposed decision gates

**These are hypotheses, not results.** Denominators are stated because a
percentage without one is a decoration. With 8 to 12 venues over 3 weekends the
samples are small: a single quiet Saturday moves every number here by a lot, so
report counts alongside every percentage and do not treat a 10% difference as a
signal.

| Question | Proposed target | Denominator | If it misses |
|---|---|---|---|
| Can coverage hold? | ≥ 70% of pilot venues have a report under 1 hour old at the 11pm and midnight samples | pilot venues × sample points | Coverage is the whole product. Narrow to 5 venues before widening |
| Do people finish a report? | ≥ 60% of started reports are accepted | `report_started` | The sheet or the network is the problem, not demand. Watch `report_rejected` reasons first |
| Is the output worth anything? | ≥ 25% of sessions that reach a venue page click directions or a source | sessions reaching a venue page | People are looking and not acting. The information is not decisive enough |
| Does it spread? | ≥ 15% of venue shares produce a referred visit | `venue_share_attempted` | Sharing is not the loop. Do not build more social features on top of it |
| Does the group flow get used? | ≥ 40% of shortlists get 2 or more votes | `shortlist_created` | It solves a problem people do not have, or the link is landing badly |
| Do people come back? | ≥ 20% of browsers from weekend 1 return on weekend 2 or 3 | distinct browsers in weekend 1 | This is the one that decides whether there is a product. Fresh coverage without return use means it is a novelty |

Run all three weekends before judging any of them. Two nights is weather.

---

## 5. Business model, and what is not being claimed

**Discovery stays free.** Charging to see where to go kills the contribution
loop that produces the data.

Possible later revenue experiments, none of which exist today:

- **Promoted events**, clearly labelled, sitting outside organic ranking. A
  venue can buy attention; it can never buy a crowd score.
- **Ticket referral**, where a real agreement exists. Disclose it on the card.

Not on the table: a paywall, selling ranking positions, or implying a commercial
integration that has not been signed.

### On Google

Google already shows popular times and live visit data for many venues, and it
has vastly more devices than this will. Competing on "how busy is it" alone is
not a viable position. What Google does not have:

- whether people currently inside think it is **worth being there**,
- **queue and cover** context that decides whether you walk over,
- **tonight's events** tied to those same venues,
- a **group decision link** for the actual moment of choosing.

That combination is the bet. It is a bet, not a finding.

---

## 6. What "ready" means

Two separate claims, and they should never be merged in a progress update:

- **The software is ready to pilot.** It builds, the checks pass, the data it
  shows is either sourced or labelled as unsourced, and it behaves honestly with
  zero reports.
- **The business is validated.** Nothing here shows that. It requires real
  coverage holding up over three weekends and people coming back, which is
  exactly what the gates above are designed to find out.

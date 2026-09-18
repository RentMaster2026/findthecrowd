# Data changes

Every listing that was corrected, demoted or deleted, and why. Kept as a file
rather than a commit message because an operator needs to be able to check what
happened to a specific venue or event without reading the git history.

No crowd reports were created, modified or deleted. There were none in the
database to begin with, and nothing in this work writes to them.

---

## Deleted

### "REDBLACKS home game", TD Place, every Saturday, 7pm, $35

Generated weekly by `src/data/events.ts` and published with the source label
"Team schedule". It was wrong in three separate ways:

1. **No team plays a home game every week.** The template produced one every
   Saturday indefinitely.
2. **The specific date was contradicted.** The site was advertising a home game
   at TD Place on Sept 19, 2026. The 2026 season has Ottawa **away at Calgary**
   (McMahon Stadium) that day.
3. **The price was invented.** $35 appeared on the card with nothing behind it.

Checked against
<https://en.wikipedia.org/wiki/2026_Ottawa_Redblacks_season> on 2026-09-17.

Deleted rather than demoted to the unverified fixtures, because there is no
version of a weekly home fixture that could ever be verified.

### "Game-day pre-drinks", Glebe Central Pub, every Saturday, 4:30pm

Deleted with it. It existed only as a satellite of the fabricated home game.

---

## Added, verified

| Event | Venue | When | Price | Source | Checked |
|---|---|---|---|---|---|
| REDBLACKS vs Calgary Stampeders | TD Place | Sat 26 Sep 2026, 3:00pm | **unknown** | [2026 Ottawa Redblacks season](https://en.wikipedia.org/wiki/2026_Ottawa_Redblacks_season) | 2026-09-17 |
| Tuesday Arcade | House of TARG | Every Tuesday, 5pm–11pm | $12.50 | [houseoftarg.com](https://www.houseoftarg.com/) | 2026-09-17 |
| Free-Play Sunday: After Dark | House of TARG | Every Sunday, 8pm–12am | $12.50 | [houseoftarg.com](https://www.houseoftarg.com/) | 2026-09-17 |

Notes on these three:

- The REDBLACKS **price is recorded as unknown**, not guessed. The source
  confirms the fixture, not the ticket price.
- The REDBLACKS **source should be upgraded**. ottawaredblacks.com returns 403
  to automated requests, so the official schedule page could not be read
  directly. The Wikipedia season page is a real supporting page for this
  specific fixture, but the official schedule or ticketing URL is better.
- House of TARG's **dated one-off concerts were not added.** The page lists
  prices for them ($12.50+tax, $10 advance / $15 door, $15) but no calendar
  dates, so there is nothing to verify a specific night against.
- House of TARG's **Saturday/Sunday noon-to-8pm family free-play session is
  verified but deliberately excluded**, as out of scope for a nightlife feed.

---

## Demoted to unverified fixtures

The remaining 27 weekly templates moved to `src/data/events.sample.ts`. They are
**not deleted**: several are probably true, and it is cheaper for an operator to
verify a known list than to rebuild it from memory.

They are marked `verified: false`, carry a source with no URL, and are only
requested when the demo dataset is enabled. They cannot render in production.

Affected venues: Berlin Nightclub, The 27 Club, The Lookout Bar, The Palace, The
Show, Room 104, Heart & Crown, Rainbow Bistro, Dominion Tavern, Lowertown
Brewery, NUVO Lounge 295, Happy Fish Elgin, LIVE! on Elgin, The Standard, City
at Night, City Gridwrks, House of TARG, Swizzles, Irene's Pub, Hintonburg Public
House, Bronson Centre, Copper Spirits and Sights, Lieutenant's Pump.

To promote one: open the venue's own events page, confirm the night, the time
and the price, then move it into `VERIFIED_RECURRING` in `src/data/events.ts`
with a `source.url` pointing at that page and today's date in `checkedAt`.

---

## Venue directory

No venues were added or removed. One flag for manual follow-up:

- **Rainbow Bistro** — `rainbowbistro.com` now redirects to a GoDaddy "domain
  for sale" page. The venue may have closed, rebranded or simply let the domain
  lapse. Confirm before the pilot; an entry for a closed venue is worse than a
  missing one.

Opening hours were **not** invented for any venue. `Venue.hours` is absent
across the directory, so every venue honestly reports "hours unconfirmed".
Sample hours exist for two venues in `events.sample.ts` purely so the
open / opens-later / closed code paths can be seen working in a development
preview; they never load in production.

---

## Claims on /about reconciled with the code

| Claim as it stood | Reality | What changed |
|---|---|---|
| Influence halves every 90 min, drops out after 6 hours | True | Kept, now interpolated from the constants |
| Under 4 reports is low signal | True of reports, but reports were counted, not people | Now counts **distinct contributors**; one device cannot reach the threshold alone |
| 20 min per venue, 12 per hour per device, "enforced in the database" | True; the trigger exists | Kept. The API now also returns a different message for each of the two limits |
| "Reports can be confirmed or disputed by other people" | **False.** The table and the scoring weight exist; there is no interface | `/about` now says plainly that this is not built yet |
| "Reports are deleted after 30 days" | **Unenforced.** `prune_old_reports()` existed but nothing ran it | Migration 002 schedules it with pg_cron, and the page says an operator must confirm it is running |
| Implied that contributors were present | Never verified | `/about` now states there is no presence verification and that a report is one anonymous browser |

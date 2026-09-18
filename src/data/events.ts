import { NIGHT_CUTOFF_HOUR, addDays, nightOf, ottawaInstant, weekdayOf } from "@/lib/time";
import type { PlainDate } from "@/lib/time";
import type { EventPrice, EventStatus, SourceRef, VenueEvent } from "@/lib/types";
import { SAMPLE_ONE_OFFS, SAMPLE_RECURRING } from "./events.sample";

/**
 * Event supply for the Ottawa MVP.
 *
 * What changed and why
 * --------------------
 * This file used to hold thirty weekly templates that were expanded against the
 * current date and rendered as public listings with a source label like "Venue
 * listing". None of them had a URL behind them, and at least one of them was
 * provably false: a "REDBLACKS home game" every single Saturday at TD Place,
 * while the real 2026 schedule has Ottawa away at Calgary on Sept 19 and one
 * home date on Sept 26. A recurring weekly home game is not a scheduling slip,
 * it is a listing that was never checked against anything.
 *
 * So listings now split in two:
 *
 *   VERIFIED    Every entry carries a `SourceRef` pointing at the page that
 *               supports that specific event, plus the date a human checked it.
 *               Only these render publicly.
 *   SAMPLE      The previous templates, preserved so the operator can verify
 *               and promote them rather than retype them. They never render in
 *               production; see `includeUnverified`.
 *
 * Nothing here invents a price. An event whose door price nobody checked
 * carries `{ kind: "unknown" }` and the card says so in words.
 */

export interface RecurringDef {
  venueId: string;
  title: string;
  /**
   * Weekday of the NIGHT this belongs to, 0 = Sunday .. 6 = Saturday.
   *
   * This is the night, not the calendar date. A Saturday-night set at 00:30
   * has nightWeekday 6 and happens on Sunday's calendar date; the expansion
   * works that out, so nobody has to remember to shift it by hand.
   */
  nightWeekday: number;
  /** Ottawa wall-clock start, "HH:MM". */
  time: string;
  durationHours: number;
  category: VenueEvent["category"];
  price: EventPrice;
  source: SourceRef;
  ticketUrl?: string | null;
  /** Nights this recurrence is known not to run (holidays, private hires). */
  exceptions?: PlainDate[];
  /** Nights outside [from, until] are not generated. */
  from?: PlainDate;
  until?: PlainDate;
}

export interface OneOffDef {
  venueId: string;
  title: string;
  /** The Ottawa night, not necessarily the calendar date of the start time. */
  night: PlainDate;
  time: string;
  durationHours: number;
  category: VenueEvent["category"];
  price: EventPrice;
  source: SourceRef;
  ticketUrl?: string | null;
  status?: EventStatus;
  note?: string;
}

/* ------------------------------------------------------------- verified --- */

const TARG_EVENTS: SourceRef = {
  label: "House of TARG events page",
  url: "https://www.houseoftarg.com/",
  checkedAt: "2026-09-17",
};

/**
 * Recurring nights that a named page actually states.
 *
 * House of TARG publishes its weekly arcade sessions with days, times and the
 * door price on its own events page, so these three are verifiable as written.
 * The venue's dated one-off concerts are NOT here: the page lists prices for
 * them but no calendar dates, so there is nothing to verify a specific night
 * against. That gap is real and is listed for the operator in docs/PILOT.md.
 *
 * Its Saturday/Sunday noon-to-8pm family free-play session is deliberately left
 * out as out of scope for a nightlife feed, not because it is unverified.
 */
export const VERIFIED_RECURRING: RecurringDef[] = [
  {
    venueId: "v-house-of-targ",
    title: "Tuesday Arcade",
    nightWeekday: 2,
    time: "17:00",
    durationHours: 6,
    category: "community",
    price: { kind: "amount", cad: 12.5 },
    source: TARG_EVENTS,
  },
  {
    venueId: "v-house-of-targ",
    title: "Free-Play Sunday: After Dark",
    nightWeekday: 0,
    time: "20:00",
    durationHours: 4,
    category: "community",
    price: { kind: "amount", cad: 12.5 },
    source: TARG_EVENTS,
  },
];

/**
 * Dated events confirmed against a schedule.
 *
 * The REDBLACKS entry replaces the fabricated weekly one. Sept 26 at 3pm is the
 * next actual home date in the 2026 season; Sept 19, which the site was
 * advertising as a home game, is Ottawa at Calgary.
 *
 * The source here is the Wikipedia season page because ottawaredblacks.com
 * refuses automated requests (403). It is a real supporting page rather than a
 * homepage, but the operator should replace it with the official schedule or
 * ticketing URL before the pilot; that task is in docs/PILOT.md. The ticket
 * price is `unknown` rather than guessed, because no price was checked.
 */
export const VERIFIED_ONE_OFFS: OneOffDef[] = [
  {
    venueId: "v-td-place",
    title: "REDBLACKS vs Calgary Stampeders",
    night: "2026-09-26",
    time: "15:00",
    durationHours: 3,
    category: "sports",
    price: { kind: "unknown" },
    source: {
      label: "2026 Ottawa Redblacks season schedule",
      url: "https://en.wikipedia.org/wiki/2026_Ottawa_Redblacks_season",
      checkedAt: "2026-09-17",
    },
  },
];

/* ------------------------------------------------------------ expansion --- */

/**
 * The calendar date an event lands on, given the night it belongs to.
 * Anything before the night cutoff is the small hours of the following day.
 */
function calendarDateFor(night: PlainDate, time: string): PlainDate {
  const hour = Number(time.split(":")[0]);
  return hour < NIGHT_CUTOFF_HOUR ? addDays(night, 1) : night;
}

function buildEvent(
  def: Omit<OneOffDef, "night"> & { night: PlainDate },
  verified: boolean
): VenueEvent {
  const date = calendarDateFor(def.night, def.time);
  const startsAt = ottawaInstant(date, def.time);
  const endsAt = new Date(startsAt.getTime() + def.durationHours * 3_600_000);

  return {
    id: `${def.venueId}-${def.night}-${def.time.replace(":", "")}`,
    venueId: def.venueId,
    title: def.title,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    nightOf: def.night,
    category: def.category,
    price: def.price,
    ticketUrl: def.ticketUrl ?? null,
    source: def.source,
    status: def.status ?? "scheduled",
    verified,
    note: def.note,
  };
}

function expandRecurring(defs: RecurringDef[], nights: PlainDate[], verified: boolean) {
  const out: VenueEvent[] = [];
  for (const night of nights) {
    const dow = weekdayOf(night);
    for (const def of defs) {
      if (def.nightWeekday !== dow) continue;
      if (def.from && night < def.from) continue;
      if (def.until && night > def.until) continue;
      if (def.exceptions?.includes(night)) continue;
      out.push(buildEvent({ ...def, night }, verified));
    }
  }
  return out;
}

export interface ExpandOptions {
  /**
   * Include the unverified sample fixtures. Off by default, and the store only
   * turns it on when the demo dataset is explicitly in use, so an unverified
   * listing cannot reach a production surface by accident.
   */
  includeUnverified?: boolean;
  /** Drop events that have already finished. On by default. */
  dropFinished?: boolean;
}

/**
 * Every known event on the given nights, oldest first.
 *
 * `nights` is a list of Ottawa night dates, not a day count, so the caller
 * decides what window it means by "this week" and the expansion never has to
 * guess what today is.
 */
export function eventsForNights(
  nights: PlainDate[],
  now: Date,
  { includeUnverified = false, dropFinished = true }: ExpandOptions = {}
): VenueEvent[] {
  const out: VenueEvent[] = [
    ...expandRecurring(VERIFIED_RECURRING, nights, true),
    ...VERIFIED_ONE_OFFS.filter((d) => nights.includes(d.night)).map((d) => buildEvent(d, true)),
  ];

  if (includeUnverified) {
    out.push(
      ...expandRecurring(SAMPLE_RECURRING, nights, false),
      ...SAMPLE_ONE_OFFS.filter((d) => nights.includes(d.night)).map((d) => buildEvent(d, false))
    );
  }

  const kept = dropFinished
    ? out.filter((e) => new Date(e.endsAt ?? e.startsAt) >= now)
    : out;

  return kept.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** The next `count` nights starting from the night `now` falls in. */
export function upcomingNights(now: Date, count: number): PlainDate[] {
  const first = nightOf(now);
  return Array.from({ length: count }, (_, i) => addDays(first, i));
}

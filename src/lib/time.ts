/**
 * Ottawa time. One module, because time was the single biggest source of wrong
 * output in this app.
 *
 * The bug this replaces: every date calculation used `Date#getHours`,
 * `Date#getDay` and `Date#toDateString`, which read the *server's* timezone.
 * Vercel runs in UTC. So after 8pm Ottawa time the server had already rolled
 * over to the next calendar day, and "tonight" quietly became tomorrow — which
 * is exactly why Friday's event showed up on Thursday's homepage labelled
 * "Today" while the venue page called the same event "Tmrw".
 *
 * Rules held to here:
 *
 *   1. An instant is a `Date` (or an ISO string) and is always UTC underneath.
 *      Wall-clock time only exists relative to a named zone.
 *   2. The only zone this product knows is America/Toronto. Ottawa is in it.
 *      When a second city ships, the zone becomes an argument, not a constant.
 *   3. Conversions go through `Intl.DateTimeFormat`, which carries the real
 *      IANA rules, so DST transitions are handled by the platform rather than
 *      by arithmetic we would get wrong twice a year.
 *   4. A "night" is not a calendar day. See NIGHT_CUTOFF_HOUR.
 */

export const OTTAWA_TZ = "America/Toronto";

/**
 * The night boundary, in Ottawa wall-clock hours.
 *
 * A night out does not end at midnight. Someone looking at the app at 1am on
 * Saturday is still having Friday night, and an event that starts at 12:30am on
 * Saturday belongs on Friday's list. So a "night" runs from 05:00 on its own
 * date to 04:59:59 the next morning.
 *
 * 5am is a product choice, not a law of nature: it is after last call (2am in
 * Ontario) and after the after-hours rooms empty, and before anyone would call
 * it "tonight" again. It is one constant so it can be argued with and changed.
 *
 * The actual calendar date is always displayed alongside the night label, so
 * this convention never hides a date from anyone.
 */
export const NIGHT_CUTOFF_HOUR = 5;

/** A plain Ottawa calendar date, "YYYY-MM-DD". Never a timestamp. */
export type PlainDate = string;

export interface OttawaParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  /** 0 = Sunday .. 6 = Saturday, in Ottawa. */
  weekday: number;
}

/* ------------------------------------------------------------ internals --- */

const PARTS_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: OTTAWA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  // h23 rather than hour12:false — some ICU builds render midnight as "24"
  // under hour12:false, which silently shifts the day.
  hourCycle: "h23",
});

function rawParts(instant: Date): Omit<OttawaParts, "weekday"> {
  const parts = PARTS_FORMAT.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * Ottawa's UTC offset at a given instant, in milliseconds.
 *
 * Derived by formatting the instant in Ottawa, reading the wall clock back as
 * if it were UTC, and taking the difference. This is the standard trick and it
 * is correct across both DST transitions because `Intl` applies the real rules.
 */
function offsetMsAt(instant: Date): number {
  const p = rawParts(instant);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Drop sub-second precision on both sides so the difference is a clean offset.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/* -------------------------------------------------------------- reading --- */

/** Break an instant into Ottawa wall-clock parts. */
export function ottawaParts(instant: Date): OttawaParts {
  const p = rawParts(instant);
  return {
    ...p,
    // Weekday of the Ottawa calendar date, computed from the date itself rather
    // than from the instant, so it cannot drift by a day near midnight.
    weekday: new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(),
  };
}

/** The Ottawa calendar date an instant falls on, "YYYY-MM-DD". */
export function ottawaDate(instant: Date): PlainDate {
  const p = rawParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/* -------------------------------------------------------------- writing --- */

/**
 * The instant at which a given Ottawa wall-clock time occurs.
 *
 * `ottawaInstant("2026-09-19", "22:30")` is 10:30pm in Ottawa on that date,
 * whatever the server's timezone and whichever side of a DST change it lands on.
 *
 * Method: build a candidate for the offset in force a day either side of the
 * requested time, then keep the candidates that actually read back as the wall
 * time we asked for. That check is what distinguishes the two awkward cases,
 * and both land on a real instant rather than throwing:
 *
 *   - Fall back. 01:30 on the first Sunday in November happens twice, so both
 *     candidates read back correctly. We take the earlier one, which is the
 *     first time the clock shows 01:30 — the reading a person would mean.
 *   - Spring forward. 02:30 on the second Sunday in March never happens, so
 *     neither candidate reads back. We take the later one, which shifts the
 *     event forward by the length of the gap to 03:30. That matches how a
 *     venue actually behaves: the night does not lose an event, it starts an
 *     hour later by the clock.
 */
export function ottawaInstant(date: PlainDate, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm = 0] = time.split(":").map(Number);

  const naive = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  const DAY_MS = 86_400_000;

  // A DST transition happens at most once in a 48-hour span, so sampling the
  // offset a day either side brackets every possible offset for this wall time.
  const offsetBefore = offsetMsAt(new Date(naive - DAY_MS));
  const offsetAfter = offsetMsAt(new Date(naive + DAY_MS));

  const candidates =
    offsetBefore === offsetAfter
      ? [naive - offsetBefore]
      : [naive - offsetBefore, naive - offsetAfter];

  const readsBack = candidates.filter((ts) => {
    const p = rawParts(new Date(ts));
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) === naive;
  });

  return new Date(readsBack.length > 0 ? Math.min(...readsBack) : Math.max(...candidates));
}

/* --------------------------------------------------------------- nights --- */

/**
 * Which night an instant belongs to. Before NIGHT_CUTOFF_HOUR it is still the
 * previous night: 1:30am Saturday is Friday night.
 */
export function nightOf(instant: Date): PlainDate {
  const p = ottawaParts(instant);
  const date = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  return p.hour < NIGHT_CUTOFF_HOUR ? addDays(date, -1) : date;
}

/** The half-open instant range [start, end) covered by a night. */
export function nightWindow(night: PlainDate): { start: Date; end: Date } {
  return {
    start: ottawaInstant(night, `${pad(NIGHT_CUTOFF_HOUR)}:00`),
    end: ottawaInstant(addDays(night, 1), `${pad(NIGHT_CUTOFF_HOUR)}:00`),
  };
}

/** Calendar arithmetic on plain dates. Never touches a timezone. */
export function addDays(date: PlainDate, days: number): PlainDate {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate()
  )}`;
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: PlainDate, to: PlainDate): number {
  const parse = (s: PlainDate) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

/** 0 = Sunday .. 6 = Saturday, for a plain Ottawa date. */
export function weekdayOf(date: PlainDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/* ------------------------------------------------------------ formatting -- */

const CLOCK_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: OTTAWA_TZ,
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h12",
});

/**
 * "10:30pm", "8pm". Compact because it sits in a 58px column.
 *
 * Built from the Ottawa parts rather than from `toLocaleTimeString` so the
 * output is identical on a Vercel container and on a laptop in Ottawa.
 */
export function formatOttawaClock(instant: Date | string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const p = ottawaParts(d);
  const suffix = p.hour >= 12 ? "pm" : "am";
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return p.minute === 0 ? `${h12}${suffix}` : `${h12}:${pad(p.minute)}${suffix}`;
}

/** Longer form for accessible names and detail lines: "10:30 p.m." */
export function formatOttawaClockLong(instant: Date | string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return CLOCK_FORMAT.format(d);
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "Sat 19 Sep" — used wherever the date must stay visible. */
export function formatNightShort(night: PlainDate): string {
  const [, m, d] = night.split("-").map(Number);
  return `${WEEKDAY_SHORT[weekdayOf(night)]} ${d} ${MONTH_SHORT[m - 1]}`;
}

/** "Saturday, September 19" — for headings and accessible names. */
export function formatNightLong(night: PlainDate): string {
  const [, m, d] = night.split("-").map(Number);
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    weekdayOf(night)
  ];
  return `${weekday}, ${MONTH_LONG[m - 1]} ${d}`;
}

/**
 * The heading for a night, relative to the night being viewed.
 *
 * "Tonight" and "Tomorrow" are allowed, but the caller is expected to render
 * `formatNightShort` next to them. A relative word on its own is how a Friday
 * event ends up looking like it is happening right now.
 */
export function nightHeading(night: PlainDate, currentNight: PlainDate): string {
  const delta = daysBetween(currentNight, night);
  if (delta === 0) return "Tonight";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Last night";
  return formatNightShort(night);
}

/**
 * The full "when", with the date always present and never repeated.
 *
 * `nightHeading` falls back to the short date for anything past tomorrow, so
 * composing it with `formatNightShort` by hand produced "Fri 25 Sep · Fri 25
 * Sep". One function, so no caller can make that mistake again.
 */
export function describeNight(night: PlainDate, currentNight: PlainDate): string {
  const heading = nightHeading(night, currentNight);
  const short = formatNightShort(night);
  return heading === short ? short : `${heading} · ${short}`;
}

/** Short relative day tag for dense rows: "Tonight", "Tmrw", "Sat". */
export function nightTag(night: PlainDate, currentNight: PlainDate): string {
  const delta = daysBetween(currentNight, night);
  if (delta === 0) return "Tonight";
  if (delta === 1) return "Tmrw";
  return WEEKDAY_SHORT[weekdayOf(night)];
}

/**
 * How an event's timing should read in one string, date always included.
 * "Tonight, Thu 17 Sep, 10:30pm" — never just "10:30pm", which was the bug.
 */
export function describeEventTiming(startsAt: string, currentNight: PlainDate): string {
  const night = nightOf(new Date(startsAt));
  return `${describeNight(night, currentNight).replace(" · ", ", ")}, ${formatOttawaClock(
    startsAt
  )}`;
}

/** "September 2026" — used on the guides index for the last-updated line. */
export function formatMonthLong(date: PlainDate): string {
  const [y, m] = date.split("-").map(Number);
  return `${MONTH_LONG[m - 1]} ${y}`;
}

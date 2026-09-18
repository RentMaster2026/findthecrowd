import { NIGHT_CUTOFF_HOUR, addDays, nightOf, ottawaInstant, weekdayOf } from "./time";
import type { OpenState, Venue } from "./types";

/**
 * Whether a venue's doors are open, from published hours only.
 *
 * The rule this enforces: "open" is a claim about the world, so it needs a
 * source. It is never inferred from an event title (a listing for a 10pm DJ
 * set is not evidence the bar is open at 8pm) and never from a report (someone
 * was inside an hour ago; that is the past tense).
 *
 * A venue with no verified hours reports "unconfirmed", which is different from
 * closed and is displayed differently. Most of the directory is in that state
 * right now, and saying so is the honest answer.
 */

function closesNextDay(open: string, close: string): boolean {
  return Number(close.split(":")[0]) <= Number(open.split(":")[0]);
}

function calendarDateFor(night: string, time: string): string {
  return Number(time.split(":")[0]) < NIGHT_CUTOFF_HOUR ? addDays(night, 1) : night;
}

export function openStateFor(venue: Venue, now: Date): OpenState {
  const hours = venue.hours;
  if (!hours) return { kind: "unconfirmed" };

  const night = nightOf(now);
  const entry = hours.week[weekdayOf(night)];
  if (!entry) return { kind: "closed-tonight" };

  const openDate = calendarDateFor(night, entry.open);
  const closeDate = closesNextDay(entry.open, entry.close)
    ? addDays(openDate, 1)
    : openDate;

  const opensAt = ottawaInstant(openDate, entry.open);
  const closesAt = ottawaInstant(closeDate, entry.close);

  if (now < opensAt) return { kind: "opens-later", opensAt: opensAt.toISOString() };
  if (now < closesAt) return { kind: "open", closesAt: closesAt.toISOString() };
  return { kind: "closed-tonight" };
}

/** Sort weight so open venues lead, then opening later, then unconfirmed. */
export function openRank(state: OpenState): number {
  switch (state.kind) {
    case "open":
      return 3;
    case "opens-later":
      return 2;
    case "unconfirmed":
      return 1;
    case "closed-tonight":
      return 0;
  }
}

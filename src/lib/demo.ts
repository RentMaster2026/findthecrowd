import { demoDataEnabled } from "./store";
import { OTTAWA_TZ, ottawaInstant, ottawaParts } from "./time";

/**
 * Demo clock.
 *
 * Crowd data is time-of-day data: at 2pm on a Tuesday the honest answer is
 * "nobody has reported anything", and the app says so. That is correct
 * behaviour and useless for showing someone what the product does.
 *
 * So `?at=peak` (or `?at=23`, any hour) winds the clock forward to the next
 * Saturday at that hour in Ottawa and renders the city as it would look then.
 * It only works while the demo dataset is in use — with a database connected,
 * or in a production build, the clock is whatever time it actually is and this
 * is ignored entirely.
 *
 * The hour is interpreted as an Ottawa wall-clock hour, not a server hour, for
 * the same reason everything else in this app is.
 */
export function resolveNow(at?: string): { now: Date; simulated: boolean } {
  const real = new Date();
  if (!at || !demoDataEnabled()) return { now: real, simulated: false };

  const hour = at === "peak" ? 23 : Number(at);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { now: real, simulated: false };
  }

  const parts = ottawaParts(real);
  const daysToSaturday = (6 - parts.weekday + 7) % 7;

  // Build the target from Ottawa's own calendar date, then let the timezone
  // conversion place it, rather than shifting a Date in the server's zone.
  const target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysToSaturday));
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");

  return { now: ottawaInstant(`${y}-${m}-${d}`, `${String(hour).padStart(2, "0")}:30`), simulated: true };
}

export function simulatedLabel(now: Date): string {
  // en-CA renders "p.m." with a trailing dot, which doubles up against the
  // sentence's own full stop. Strip it here rather than at each call site.
  return now
    .toLocaleString("en-CA", {
      timeZone: OTTAWA_TZ,
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\.$/, "");
}

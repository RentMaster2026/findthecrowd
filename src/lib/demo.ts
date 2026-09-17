import { isLiveBackend } from "./store";

/**
 * Demo clock.
 *
 * Crowd data is time-of-day data: at 2pm on a Tuesday the honest answer is
 * "nobody has reported anything", and the app says so. That is correct
 * behaviour and terrible for showing someone what the product does.
 *
 * So `?at=peak` (or `?at=23`, any hour) winds the clock forward to the next
 * Saturday at that hour and renders the city as it would look then. It only
 * works while the demo dataset is in use — once Supabase is connected, the
 * clock is whatever time it actually is and this is ignored entirely.
 */
export function resolveNow(at?: string): { now: Date; simulated: boolean } {
  const real = new Date();
  if (!at || isLiveBackend()) return { now: real, simulated: false };

  const hour = at === "peak" ? 23 : Number(at);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return { now: real, simulated: false };
  }

  const now = new Date(real);
  // Next Saturday (or today, if today is already Saturday).
  const daysToSaturday = (6 - now.getDay() + 7) % 7;
  now.setDate(now.getDate() + daysToSaturday);
  now.setHours(hour, 30, 0, 0);
  return { now, simulated: true };
}

export function simulatedLabel(now: Date): string {
  return now.toLocaleString("en-CA", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

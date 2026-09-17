/**
 * Compact time formatting.
 *
 * `toLocaleTimeString` in en-CA gives "10:30 p.m.", which is three lines of
 * wrap in a 60px column. Event rows need "10:30pm" and "8pm".
 */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  const h24 = d.getHours();
  const m = d.getMinutes();
  const suffix = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tmrw";
  return d.toLocaleDateString("en-CA", { weekday: "short" });
}

export function dayHeading(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const today = new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Tonight";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" });
}

/**
 * Format a plain "YYYY-MM-DD" date without letting a timezone move it.
 *
 * `new Date("2026-09-17")` is midnight UTC, which is the evening of the 16th in
 * Ottawa, so the naive version prints the wrong day for every reader in this
 * city. Parsing the parts by hand avoids the whole problem.
 */
export function formatPlainDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPlainMonth(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });
}

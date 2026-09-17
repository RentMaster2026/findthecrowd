"use client";

/**
 * Anonymous, device-scoped reporter identity.
 *
 * Deliberately not an account. Waze's contribution loop works because reporting
 * costs nothing — asking for a sign-up before the first report would kill the
 * only data source this product has. The id is a random string in localStorage:
 * it is not tied to a person, carries no profile, and the user can clear it.
 *
 * It exists for exactly two jobs: enforcing the report cooldown, and letting
 * someone see their own reports. When accounts arrive, this id becomes the
 * migration key rather than being thrown away.
 */

const KEY = "findthecrowd:reporter-id";

export function getReporterId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const id = `d_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Private mode or blocked storage: fall back to a per-tab id.
    return `d_ephemeral_${Math.random().toString(36).slice(2, 12)}`;
  }
}

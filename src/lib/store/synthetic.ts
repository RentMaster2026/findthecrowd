import { VENUES } from "@/data/venues";
import { venueClass } from "@/lib/labels";
import type { CrowdLevel, CrowdReport, LineLength, VibeTag } from "@/lib/types";

/**
 * Demo report generator.
 *
 * This exists so `npm run dev` with no database shows a city that looks alive.
 * It is NOT a simulation anyone should trust and it never runs when Supabase is
 * configured. Every report it produces is flagged `reporterId: "demo:*"` so it
 * can be filtered or deleted in one query if it ever leaks into a real table.
 */

/** Deterministic PRNG so server and client agree and reloads are stable. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * How busy a place like this usually is, 0-1, by hour and weekday.
 *
 * Restaurants and bars are on completely different clocks. A dining room is
 * full at 7pm and empty at 1am; a club is the reverse. Running both off one
 * curve makes the demo obviously wrong to anyone who lives here.
 */
function activityCurve(hour: number, dayOfWeek: number, food: boolean): number {
  const weekend = dayOfWeek === 5 || dayOfWeek === 6;
  const thursday = dayOfWeek === 4;

  if (food) {
    const dayWeight = weekend ? 1 : thursday ? 0.8 : 0.55;
    let hourWeight: number;
    if (hour >= 18 && hour < 21) hourWeight = 1;
    else if (hour >= 21 && hour < 23) hourWeight = 0.6;
    else if (hour >= 12 && hour < 14) hourWeight = 0.6;
    else if (hour >= 14 && hour < 18) hourWeight = 0.3;
    else if (hour >= 23 || hour < 2) hourWeight = 0.2;
    else hourWeight = 0.05;
    return dayWeight * hourWeight;
  }

  const dayWeight = weekend ? 1 : thursday ? 0.6 : 0.25;
  let hourWeight: number;
  if (hour >= 22 || hour < 2) hourWeight = 1;
  else if (hour >= 20) hourWeight = 0.7;
  else if (hour >= 17) hourWeight = 0.4;
  else if (hour >= 2 && hour < 4) hourWeight = 0.5;
  else hourWeight = 0.05;

  return dayWeight * hourWeight;
}

const GOOD_TAGS: VibeTag[] = ["good-music", "good-crowd", "cheap-drinks", "fast-door", "good-staff"];
const BAD_TAGS: VibeTag[] = ["bad-music", "dead-floor", "overpriced", "slow-door", "rough-night"];
const GOOD_FOOD_TAGS: VibeTag[] = ["good-food", "good-crowd", "good-staff", "worth-the-wait"];
const BAD_FOOD_TAGS: VibeTag[] = ["overpriced", "slow-service"];

/**
 * Produce the demo report set for a given moment. Stable within a 10-minute
 * bucket so the page doesn't reshuffle on every refresh.
 */
export function syntheticReports(now: Date = new Date()): CrowdReport[] {
  const bucket = Math.floor(now.getTime() / (10 * 60 * 1000));
  const reports: CrowdReport[] = [];

  for (const venue of VENUES) {
    const food = venueClass(venue.kind) === "food";
    const activity = activityCurve(now.getHours(), now.getDay(), food);
    const rand = mulberry32(hash(venue.id) ^ bucket);

    // Each venue has a persistent quality bias — some rooms are just better.
    const quality = mulberry32(hash(venue.slug))();
    const sizeFactor = venue.capacityBand === "large" ? 1.4 : venue.capacityBand === "medium" ? 1 : 0.6;

    const expected = activity * sizeFactor * 9;
    const count = Math.max(0, Math.round(expected * (0.5 + rand())));
    if (count === 0) continue;

    for (let i = 0; i < count; i++) {
      const ageMin = Math.round(rand() * 300);
      const createdAt = new Date(now.getTime() - ageMin * 60000);

      const crowdBase = 1 + activity * 4 * sizeFactor;
      const crowd = Math.max(1, Math.min(5, Math.round(crowdBase + (rand() - 0.5) * 2))) as CrowdLevel;

      // Spread matters: a demo where every venue reads 90% teaches the viewer
      // nothing. Venue quality drives most of it, crowd nudges it.
      const worthIt = rand() < 0.12 + quality * 0.72 + (crowd >= 4 ? 0.08 : 0);

      const lineRoll = rand() * (crowd / 5);
      const line: LineLength =
        lineRoll > 0.6 ? "brutal" : lineRoll > 0.42 ? "long" : lineRoll > 0.22 ? "short" : "none";

      const pool = food ? (worthIt ? GOOD_FOOD_TAGS : BAD_FOOD_TAGS) : worthIt ? GOOD_TAGS : BAD_TAGS;
      const tags: VibeTag[] = [];
      for (let t = 0; t < 2; t++) {
        const tag = pool[Math.floor(rand() * pool.length)];
        if (!tags.includes(tag)) tags.push(tag);
      }

      const cover =
        food || venue.typicalCover === null
          ? null
          : Math.max(0, venue.typicalCover + Math.round((rand() - 0.5) * 10));

      reports.push({
        id: `demo-${venue.id}-${bucket}-${i}`,
        venueId: venue.id,
        reporterId: `demo:${Math.floor(rand() * 400)}`,
        createdAt: createdAt.toISOString(),
        crowd,
        line,
        cover,
        worthIt,
        tags,
        netConfirms: Math.round((rand() - 0.35) * 4),
      });
    }
  }

  return reports;
}

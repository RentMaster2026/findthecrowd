/**
 * The Vibe Score engine.
 *
 * Design notes, because this number is the product:
 *
 * 1. The headline score is a PERCENTAGE OF PEOPLE, not an average rating.
 *    Rotten Tomatoes works because "73% of critics said see it" is a sentence
 *    a human can check. "3.8 stars" is not. So the only input to the headline
 *    number is one binary question: would you tell a friend to come here now?
 *
 * 2. Nightlife decays fast. A report from 9pm tells you almost nothing about
 *    midnight. Every report's weight halves every HALF_LIFE_MIN minutes, and
 *    anything older than WINDOW_MIN is dropped entirely.
 *
 * 3. Crowd level is reported and displayed SEPARATELY from the score. Packed
 *    and good are different facts. Conflating them is how you end up
 *    recommending a bad club with a long line.
 *
 * 4. Below MIN_CONFIDENT_REPORTS we still show a number but mark it
 *    unconfident. Hiding it entirely makes a new city feel dead; presenting
 *    two reports as fact makes the product a liar.
 */

import type {
  CrowdReport,
  Freshness,
  LineLength,
  ScoreBand,
  VibeScore,
  VibeTag,
} from "./types";

/** Reports older than this are ignored completely. */
export const WINDOW_MIN = 6 * 60;
/** A report's influence halves every this many minutes. */
export const HALF_LIFE_MIN = 90;
/** Fewer than this many reports and the score is shown as low-confidence. */
export const MIN_CONFIDENT_REPORTS = 4;
/** A tag must appear in at least this share of reports to surface. */
export const TAG_THRESHOLD = 1 / 3;

const LINE_ORDER: LineLength[] = ["none", "short", "long", "brutal"];

export function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 60000;
}

/** Exponential recency decay. Returns a multiplier in (0, 1]. */
export function recencyWeight(ageMinutes: number): number {
  if (ageMinutes <= 0) return 1;
  return Math.pow(0.5, ageMinutes / HALF_LIFE_MIN);
}

/**
 * Community confirmations bend a report's weight but cannot erase or double it.
 * One angry promoter downvoting should not delete an honest report; one popular
 * reporter should not outvote the room.
 */
export function trustWeight(netConfirms: number): number {
  const clamped = Math.max(-3, Math.min(5, netConfirms));
  return 1 + clamped * 0.12; // 0.64 .. 1.60
}

export function bandFor(score: number | null): ScoreBand {
  if (score === null) return "no-signal";
  if (score >= 80) return "going-off";
  if (score >= 60) return "worth-it";
  if (score >= 40) return "mixed";
  return "skip-it";
}

export function freshnessFor(minutesSinceLast: number | null): Freshness {
  if (minutesSinceLast === null) return "cold";
  if (minutesSinceLast <= 45) return "live";
  if (minutesSinceLast <= 180) return "recent";
  if (minutesSinceLast <= WINDOW_MIN) return "earlier";
  return "cold";
}

function weightedMedian(
  values: { value: number; weight: number }[]
): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, v) => sum + v.weight, 0);
  let running = 0;
  for (const v of sorted) {
    running += v.weight;
    if (running >= total / 2) return v.value;
  }
  return sorted[sorted.length - 1].value;
}

export const EMPTY_SCORE: VibeScore = {
  score: null,
  band: "no-signal",
  crowd: null,
  line: null,
  cover: null,
  sampleSize: 0,
  confident: false,
  freshness: "cold",
  minutesSinceLast: null,
  topTags: [],
};

/**
 * Compute a venue's Vibe Score from its reports.
 *
 * @param reports Any reports for the venue — filtering by age is done here.
 * @param now     Injected so this is deterministic and testable.
 */
export function computeVibeScore(
  reports: CrowdReport[],
  now: Date = new Date()
): VibeScore {
  const scored = reports
    .map((r) => {
      const age = minutesBetween(new Date(r.createdAt), now);
      return { report: r, age, weight: recencyWeight(age) * trustWeight(r.netConfirms) };
    })
    .filter((r) => r.age >= 0 && r.age <= WINDOW_MIN);

  if (scored.length === 0) return EMPTY_SCORE;

  const totalWeight = scored.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight === 0) return EMPTY_SCORE;

  // Headline: recency-weighted share of "worth it" votes.
  const worthWeight = scored
    .filter((r) => r.report.worthIt)
    .reduce((sum, r) => sum + r.weight, 0);
  const score = Math.round((worthWeight / totalWeight) * 100);

  // Crowd: weighted mean, 1-5.
  const crowd =
    scored.reduce((sum, r) => sum + r.report.crowd * r.weight, 0) / totalWeight;

  // Line: weighted median, so one person's "brutal" doesn't move the badge.
  const lineIdx = weightedMedian(
    scored.map((r) => ({
      value: LINE_ORDER.indexOf(r.report.line),
      weight: r.weight,
    }))
  );
  const line = lineIdx === null ? null : LINE_ORDER[Math.round(lineIdx)];

  // Cover: weighted median of reports that actually observed a cover.
  const covers = scored
    .filter((r) => r.report.cover !== null)
    .map((r) => ({ value: r.report.cover as number, weight: r.weight }));
  const cover = weightedMedian(covers);

  // Tags: raw frequency, not weighted — "is this said a lot" is a count question.
  const tagCounts = new Map<VibeTag, number>();
  for (const r of scored) {
    for (const tag of r.report.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .filter(([, count]) => count / scored.length >= TAG_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const minutesSinceLast = Math.min(...scored.map((r) => r.age));

  return {
    score,
    band: bandFor(score),
    crowd: Math.round(crowd * 10) / 10,
    line,
    cover,
    sampleSize: scored.length,
    confident: scored.length >= MIN_CONFIDENT_REPORTS,
    freshness: freshnessFor(minutesSinceLast),
    minutesSinceLast: Math.round(minutesSinceLast),
    topTags,
  };
}

/**
 * Feed ranking. Not the same as sorting by score.
 *
 * A 100% score from two people twenty minutes ago should not outrank an 84%
 * from fifteen people five minutes ago. So rank on the score pulled toward the
 * middle by low sample size (a Bayesian prior), then boosted by freshness.
 */
const PRIOR_SCORE = 50;
const PRIOR_WEIGHT = 3;

export function rankValue(s: VibeScore): number {
  if (s.score === null) return -1;
  const shrunk =
    (s.score * s.sampleSize + PRIOR_SCORE * PRIOR_WEIGHT) /
    (s.sampleSize + PRIOR_WEIGHT);
  const freshnessBoost =
    s.freshness === "live" ? 12 : s.freshness === "recent" ? 4 : 0;
  return shrunk + freshnessBoost;
}

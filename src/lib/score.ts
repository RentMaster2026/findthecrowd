/**
 * The scoring engine.
 *
 * Design notes, because this number is the product:
 *
 * 1. The headline is a PERCENTAGE OF PEOPLE, not an average rating and not an
 *    occupancy figure. "73% of people said go" is a sentence a human can check.
 *    "3.8 stars" is not, and "73% full" is a different claim entirely. The only
 *    input to the headline is one binary question: would you tell a friend to
 *    come here right now? The UI calls it "worth going" for that reason.
 *
 * 2. It counts PEOPLE, not submissions. A contributor's newest report replaces
 *    their older one in the current aggregate, so nobody can raise a venue by
 *    reporting it repeatedly. The older reports are still stored; they are just
 *    not counted twice in the same answer.
 *
 * 3. Different facts go stale at different speeds, so they have different
 *    windows. Whether a room is worth being in holds up for a while. How busy
 *    it is does not, and how long the door queue is decays faster still. A
 *    ninety-minute-old queue reading is not a queue reading.
 *
 * 4. Below MIN_CONFIDENT_CONTRIBUTORS the number is shown as low confidence
 *    rather than as fact. One honest recent update is still useful, and it is
 *    labelled as one person rather than dressed up as a consensus.
 *
 * 5. Ranking is not sorting by score. A 100% from two people must not beat an
 *    84% from fifteen. See `rankValue`.
 */

import type {
  CrowdReport,
  Freshness,
  LineLength,
  Observation,
  ScoreBand,
  VibeScore,
  VibeTag,
} from "./types";

/**
 * Windows, in minutes. These are starting product choices to validate during
 * the pilot, not physical constants. They are named and exported so the copy on
 * /about is generated from the same numbers the engine uses and cannot drift.
 */

/** Recommendations older than this are ignored completely. */
export const WINDOW_MIN = 6 * 60;
/** A report's influence on the recommendation halves every this many minutes. */
export const HALF_LIFE_MIN = 90;
/** Crowd level counts as current only inside this window. */
export const CROWD_FRESH_MIN = 60;
/** Door queue counts as current only inside this shorter window. */
export const QUEUE_FRESH_MIN = 30;
/** Cover charge changes slowly, so it gets the full window. */
export const COVER_FRESH_MIN = WINDOW_MIN;
/** Fewer distinct contributors than this and the number is low confidence. */
export const MIN_CONFIDENT_CONTRIBUTORS = 4;
/** A tag must be mentioned by this share of contributors to surface. */
export const TAG_THRESHOLD = 1 / 3;
/**
 * When at least this share of contributors is on the minority side, the venue
 * is reported as split rather than as a single verdict.
 */
export const SPLIT_SHARE = 0.25;

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
  if (score >= 65) return "worth-going";
  if (score >= 40) return "mixed";
  return "skip-it";
}

export function freshnessFor(minutesSinceLast: number | null): Freshness {
  if (minutesSinceLast === null) return "cold";
  // "Live" is defined as "there is current crowd data", so it uses the same
  // window. Two different definitions of live is how a badge starts lying.
  if (minutesSinceLast <= CROWD_FRESH_MIN) return "live";
  if (minutesSinceLast <= 180) return "recent";
  if (minutesSinceLast <= WINDOW_MIN) return "earlier";
  return "cold";
}

/**
 * Reports that count toward the independent public consensus.
 *
 * Team and venue reports are real information and are shown on the venue page
 * with their source on the label, but they never enter the public number. A
 * venue talking up its own room is not an independent observation, and letting
 * it in unlabelled would make the percentage meaningless.
 */
export function isIndependent(report: CrowdReport): boolean {
  return (report.role ?? "public") === "public";
}

export function partitionReports(reports: CrowdReport[]): {
  independent: CrowdReport[];
  labelled: CrowdReport[];
} {
  const independent: CrowdReport[] = [];
  const labelled: CrowdReport[] = [];
  for (const r of reports) (isIndependent(r) ? independent : labelled).push(r);
  return { independent, labelled };
}

interface Scored {
  report: CrowdReport;
  age: number;
  weight: number;
}

/**
 * One row per contributor: their most recent report inside the window.
 *
 * This is the "count people, not submissions" rule. Exported because the report
 * API and the tests both need to reason about it.
 */
export function latestPerContributor(reports: CrowdReport[], now: Date, windowMin = WINDOW_MIN) {
  const newest = new Map<string, Scored>();
  for (const report of reports) {
    const age = minutesBetween(new Date(report.createdAt), now);
    // A report from the future is a clock problem, not evidence.
    if (age < 0 || age > windowMin) continue;
    const existing = newest.get(report.reporterId);
    if (!existing || age < existing.age) {
      newest.set(report.reporterId, {
        report,
        age,
        weight: recencyWeight(age) * trustWeight(report.netConfirms),
      });
    }
  }
  return [...newest.values()];
}

function weightedMedian(values: { value: number; weight: number }[]): number | null {
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

function observe<T>(rows: Scored[], value: T): Observation<T> {
  return {
    value,
    contributors: rows.length,
    minutesSinceLast: Math.round(Math.min(...rows.map((r) => r.age))),
  };
}

export const EMPTY_SCORE: VibeScore = {
  score: null,
  band: "no-signal",
  contributors: 0,
  confident: false,
  freshness: "cold",
  minutesSinceLast: null,
  lastReportAt: null,
  crowd: null,
  queue: null,
  cover: null,
  split: false,
  topTags: [],
};

/**
 * Compute a venue's score from its reports.
 *
 * @param reports Any reports for the venue. Filtering by age, by role and by
 *                contributor happens here so no caller can forget to do it.
 * @param now     Injected so this is deterministic and testable.
 */
export function computeVibeScore(reports: CrowdReport[], now: Date = new Date()): VibeScore {
  const { independent } = partitionReports(reports);
  const rows = latestPerContributor(independent, now);

  if (rows.length === 0) return EMPTY_SCORE;

  const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight === 0) return EMPTY_SCORE;

  // Headline: recency-weighted share of contributors who said go.
  const worthWeight = rows
    .filter((r) => r.report.worthIt)
    .reduce((sum, r) => sum + r.weight, 0);
  const score = Math.round((worthWeight / totalWeight) * 100);

  // Disagreement is a fact about the room, not noise to be averaged away.
  const yes = rows.filter((r) => r.report.worthIt).length;
  const no = rows.length - yes;
  const minority = Math.min(yes, no);
  const split = minority >= 1 && minority / rows.length >= SPLIT_SHARE;

  // Crowd: only from contributors inside the crowd window.
  const crowdRows = rows.filter((r) => r.age <= CROWD_FRESH_MIN);
  const crowdWeight = crowdRows.reduce((sum, r) => sum + r.weight, 0);
  const crowd =
    crowdRows.length > 0 && crowdWeight > 0
      ? observe(
          crowdRows,
          Math.round(
            (crowdRows.reduce((sum, r) => sum + r.report.crowd * r.weight, 0) / crowdWeight) * 10
          ) / 10
        )
      : null;

  // Queue: shorter window still, and a weighted median so one person's "brutal"
  // does not move the badge on its own.
  const queueRows = rows.filter((r) => r.age <= QUEUE_FRESH_MIN);
  const queueIdx = weightedMedian(
    queueRows.map((r) => ({ value: LINE_ORDER.indexOf(r.report.line), weight: r.weight }))
  );
  const queue =
    queueRows.length > 0 && queueIdx !== null
      ? observe(queueRows, LINE_ORDER[Math.round(queueIdx)])
      : null;

  // Cover: weighted median of contributors who actually observed a cover.
  const coverRows = rows.filter((r) => r.age <= COVER_FRESH_MIN && r.report.cover !== null);
  const coverValue = weightedMedian(
    coverRows.map((r) => ({ value: r.report.cover as number, weight: r.weight }))
  );
  const cover = coverRows.length > 0 && coverValue !== null ? observe(coverRows, coverValue) : null;

  // Tags: share of contributors who mentioned it. A count question, not a
  // weighting question.
  const tagCounts = new Map<VibeTag, number>();
  for (const r of rows) {
    for (const tag of r.report.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .filter(([, count]) => count / rows.length >= TAG_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const newest = rows.reduce((best, r) => (r.age < best.age ? r : best), rows[0]);
  const minutesSinceLast = Math.round(newest.age);

  return {
    score,
    band: bandFor(score),
    contributors: rows.length,
    confident: rows.length >= MIN_CONFIDENT_CONTRIBUTORS,
    freshness: freshnessFor(minutesSinceLast),
    minutesSinceLast,
    lastReportAt: newest.report.createdAt,
    crowd,
    queue,
    cover,
    split,
    topTags,
  };
}

/**
 * Feed ranking. Not the same as sorting by score.
 *
 * A 100% from two people twenty minutes ago should not outrank an 84% from
 * fifteen people five minutes ago. So the score is pulled toward the middle in
 * proportion to how little evidence is behind it — a Bayesian prior, which is
 * the same shrinkage a Wilson interval buys without the opaque formula — and
 * then nudged by freshness.
 *
 * In plain language, for /about: a place needs both a good score and enough
 * people saying so to get to the top, and a tiny unanimous sample is treated as
 * closer to "we don't know yet" than to "this is the best place in the city".
 *
 * No machine learning. The whole ranking is four lines and can be explained to
 * a venue owner who thinks they were treated unfairly.
 */
const PRIOR_SCORE = 50;
const PRIOR_WEIGHT = 3;

export function rankValue(s: VibeScore): number {
  if (s.score === null) return -1;
  const shrunk =
    (s.score * s.contributors + PRIOR_SCORE * PRIOR_WEIGHT) / (s.contributors + PRIOR_WEIGHT);
  const freshnessBoost = s.freshness === "live" ? 12 : s.freshness === "recent" ? 4 : 0;
  return shrunk + freshnessBoost;
}

/**
 * Whether there is enough evidence to make ordered, comparative claims —
 * "busiest", numbered rankings, trend arrows.
 *
 * The report picker used to be headed "Busiest right now" while the homepage
 * said there were no reports at all. A heading like that is a claim, and a
 * claim needs a quorum behind it.
 */
export function hasRankingEvidence(scores: VibeScore[]): boolean {
  const live = scores.filter((s) => s.score !== null && s.freshness === "live");
  return live.length >= 2 && live.some((s) => s.confident);
}

import { VENUES, VENUE_BY_ID, VENUE_BY_SLUG } from "@/data/venues";
import { eventsForNights, upcomingNights } from "@/data/events";
import { SAMPLE_HOURS } from "@/data/events.sample";
import { computeVibeScore, partitionReports, rankValue } from "@/lib/score";
import { openRank, openStateFor } from "@/lib/hours";
import { venueClass } from "@/lib/labels";
import { addDays, nightOf, nightWindow, type PlainDate } from "@/lib/time";
import type {
  CrowdReport,
  Shortlist,
  ShortlistTally,
  ShortlistVote,
  Venue,
  VenueEvent,
  VenueWithScore,
  VibeScore,
} from "@/lib/types";
import { syntheticReports } from "./synthetic";
import {
  MigrationMissingError,
  fetchEvents,
  fetchRecentReports,
  fetchShortlist,
  fetchShortlistVotes,
  insertCorrection,
  insertReport,
  insertShortlist,
  supabaseConfigured,
  upsertShortlistVote,
  type CorrectionInput,
} from "./supabase";

export { MigrationMissingError };

/**
 * The data layer.
 *
 * One rule: screens never touch Supabase or the demo generator directly. They
 * call these functions. When the real event feed and venue table land, this
 * file is the only thing that changes.
 */

export interface NewReport {
  venueId: string;
  reporterId: string;
  crowd: CrowdReport["crowd"];
  line: CrowdReport["line"];
  cover: number | null;
  worthIt: boolean;
  tags: CrowdReport["tags"];
}

/**
 * The no-database fallback store.
 *
 * Hung off `globalThis` rather than held in module scope. Next compiles server
 * modules per route, so a plain module-level Map is NOT shared between, say,
 * the POST handler that creates a shortlist and the page that renders it — the
 * link would 404 the moment you opened it. One object on the global keeps every
 * route looking at the same data.
 *
 * This is development and preview scaffolding only. It is per-process and dies
 * with the server, which is exactly why shortlists need the migration in
 * production rather than this.
 */
interface MemoryStore {
  reports: CrowdReport[];
  shortlists: Map<string, Shortlist>;
  votes: Map<string, ShortlistVote[]>;
  corrections: CorrectionInput[];
}

const globalStore = globalThis as typeof globalThis & { __ftcMemory?: MemoryStore };

const memory: MemoryStore = (globalStore.__ftcMemory ??= {
  reports: [],
  shortlists: new Map(),
  votes: new Map(),
  corrections: [],
});

export function isLiveBackend(): boolean {
  return supabaseConfigured();
}

/**
 * Whether the generated demo dataset is in play.
 *
 * Three conditions, and all of them have to hold. The important one is the
 * last: a PRODUCTION build with no database shows an honest empty directory,
 * not a city full of invented reports. The previous version fell back to the
 * generator whenever env vars were absent, which meant one misconfigured
 * deploy would have published fabricated crowd data under a real domain.
 *
 * Set NEXT_PUBLIC_DEMO_DATA=1 to opt a preview deployment in on purpose. Every
 * screen that renders demo data also labels it.
 */
export function demoDataEnabled(): boolean {
  if (supabaseConfigured()) return false;
  // Explicit off switch, so a developer can see the real empty state — which
  // is a screen worth designing — without a production build.
  if (process.env.NEXT_PUBLIC_DEMO_DATA === "0") return false;
  if (process.env.NEXT_PUBLIC_DEMO_DATA === "1") return true;
  return process.env.NODE_ENV !== "production";
}

/** Venues, with sample opening hours attached only in a demo environment. */
function venues(): Venue[] {
  if (!demoDataEnabled()) return VENUES;
  return VENUES.map((v) => (SAMPLE_HOURS[v.id] ? { ...v, hours: SAMPLE_HOURS[v.id] } : v));
}

async function allReports(now: Date): Promise<CrowdReport[]> {
  if (supabaseConfigured()) return fetchRecentReports();
  if (demoDataEnabled()) return [...syntheticReports(now), ...memory.reports];
  return [...memory.reports];
}

function groupByVenue(reports: CrowdReport[]): Map<string, CrowdReport[]> {
  const map = new Map<string, CrowdReport[]>();
  for (const r of reports) {
    const list = map.get(r.venueId);
    if (list) list.push(r);
    else map.set(r.venueId, [r]);
  }
  return map;
}

/* --------------------------------------------------------------- events --- */

/**
 * Verified events for a set of nights.
 *
 * Operator-entered rows from the database win; the code-defined verified set is
 * a fallback so a fresh checkout is not empty. Unverified sample fixtures are
 * only ever requested when the demo dataset is enabled, so they cannot appear
 * on a production surface.
 */
export async function getEventsForNights(
  nights: PlainDate[],
  now: Date = new Date(),
  { dropFinished = true }: { dropFinished?: boolean } = {}
): Promise<VenueEvent[]> {
  const local = eventsForNights(nights, now, {
    includeUnverified: demoDataEnabled(),
    dropFinished,
  });

  if (!supabaseConfigured()) return local;

  const remote = await fetchEvents(nights);
  if (remote.length === 0) return local;

  // Database rows replace a code-defined event with the same id.
  const seen = new Set(remote.map((e) => e.id));
  const merged = [...remote, ...local.filter((e) => !seen.has(e.id))];
  const kept = dropFinished
    ? merged.filter((e) => new Date(e.endsAt ?? e.startsAt) >= now)
    : merged;
  return kept.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Events on the night `now` falls in, still to come. */
export async function getTonightEvents(now: Date = new Date()): Promise<VenueEvent[]> {
  return getEventsForNights([nightOf(now)], now);
}

export async function getWeekEvents(
  now: Date = new Date(),
  nights = 7
): Promise<VenueEvent[]> {
  return getEventsForNights(upcomingNights(now, nights), now);
}

/* --------------------------------------------------------------- venues --- */

export interface VenueQuery {
  district?: string;
  kind?: string;
  /** Free text over venue name and neighbourhood. */
  q?: string;
}

function matches(venue: Venue, query: VenueQuery, districtLabel: (d: string) => string): boolean {
  if (query.district && venue.district !== query.district) return false;
  if (query.kind && venue.kind !== query.kind) return false;

  /**
   * Restaurants are kept out of the default feed.
   *
   * The product answers "where should we go out tonight", and a list led by
   * three dining rooms because their names start with A dilutes that. They keep
   * their venue pages, their guide and their place in search, and they come
   * back the moment somebody asks for them by filter or by name.
   */
  if (!query.kind && !query.q?.trim() && venueClass(venue.kind) === "food") return false;

  if (query.q) {
    const needle = query.q.trim().toLowerCase();
    if (needle) {
      const haystack = `${venue.name} ${districtLabel(venue.district)}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
  }
  return true;
}

export interface ExploreResult {
  rows: VenueWithScore[];
  /** Venues with a usable recent report, best-supported first. */
  reported: VenueWithScore[];
  /** Everything else, in a stable order. Never presented as empty rooms. */
  quiet: VenueWithScore[];
  /** Distinct contributors across the city in the last hour. */
  contributorsThisHour: number;
  night: PlainDate;
}

/**
 * The Explore feed.
 *
 * Venues with recent usable reports lead. Everything else follows in a stable
 * order that never implies a verdict: no score, no crowd bar, no "0%".
 */
export async function getExplore(
  now: Date = new Date(),
  query: VenueQuery = {},
  districtLabel: (d: string) => string = (d) => d
): Promise<ExploreResult> {
  const reports = await allReports(now);
  const byVenue = groupByVenue(reports);
  const night = nightOf(now);
  const events = await getEventsForNights([night], now);

  const rows: VenueWithScore[] = venues()
    .filter((v) => matches(v, query, districtLabel))
    .map((venue) => {
      const score = computeVibeScore(byVenue.get(venue.id) ?? [], now);
      const nextEvent =
        events.find((e) => e.venueId === venue.id && e.status !== "cancelled") ?? null;
      return { venue, score, nextEvent, openState: openStateFor(venue, now) };
    });

  const reported = rows
    .filter((r) => r.score.score !== null && r.score.freshness !== "cold")
    .sort((a, b) => rankValue(b.score) - rankValue(a.score));

  const quiet = rows
    .filter((r) => r.score.score === null || r.score.freshness === "cold")
    .sort((a, b) => {
      const open = openRank(b.openState) - openRank(a.openState);
      if (open !== 0) return open;
      // An event tonight is the only other thing we actually know about a
      // venue with no reports, so it breaks the tie. Then name, for stability.
      const ev = Number(Boolean(b.nextEvent)) - Number(Boolean(a.nextEvent));
      if (ev !== 0) return ev;
      return a.venue.name.localeCompare(b.venue.name);
    });

  // Contributors, not submissions — the header count has to mean what it says.
  const hourAgo = now.getTime() - 60 * 60_000;
  const recentContributors = new Set(
    reports
      .filter((r) => new Date(r.createdAt).getTime() >= hourAgo)
      .filter((r) => (r.role ?? "public") === "public")
      .map((r) => r.reporterId)
  );

  return { rows, reported, quiet, contributorsThisHour: recentContributors.size, night };
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  return venues().find((v) => v.slug === slug) ?? null;
}

export interface VenueDetail {
  venue: Venue;
  score: VibeScore;
  /** Independent public reports, newest first. */
  reports: CrowdReport[];
  /** Team or venue reports, shown separately and labelled. */
  labelledReports: CrowdReport[];
  events: VenueEvent[];
  openState: OpenStateAlias;
  night: PlainDate;
}

type OpenStateAlias = ReturnType<typeof openStateFor>;

export async function getVenueDetail(
  slug: string,
  now: Date = new Date()
): Promise<VenueDetail | null> {
  const venue = venues().find((v) => v.slug === slug);
  if (!venue) return null;

  const all = (await allReports(now))
    .filter((r) => r.venueId === venue.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const { independent, labelled } = partitionReports(all);
  const night = nightOf(now);

  return {
    venue,
    score: computeVibeScore(all, now),
    reports: independent.slice(0, 25),
    labelledReports: labelled.slice(0, 10),
    events: await getEventsForNights(upcomingNights(now, 7), now),
    openState: openStateFor(venue, now),
    night,
  };
}

/**
 * Scores for a named set of venues, in the order given. Used by the guide
 * pages, which name specific places and need a live number next to each.
 */
export async function getScoresForSlugs(
  slugs: string[],
  now: Date = new Date()
): Promise<VenueWithScore[]> {
  const reports = await allReports(now);
  const byVenue = groupByVenue(reports);
  const events = await getEventsForNights([nightOf(now)], now);

  return slugs
    .map((slug) => {
      const venue = venues().find((v) => v.slug === slug);
      if (!venue) return null;
      const score = computeVibeScore(byVenue.get(venue.id) ?? [], now);
      const nextEvent = events.find((e) => e.venueId === venue.id) ?? null;
      return { venue, score, nextEvent, openState: openStateFor(venue, now) };
    })
    .filter((row): row is VenueWithScore => row !== null);
}

/* -------------------------------------------------------------- reports --- */

export async function submitReport(input: NewReport): Promise<CrowdReport> {
  const report: CrowdReport = {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    venueId: input.venueId,
    reporterId: input.reporterId,
    createdAt: new Date().toISOString(),
    crowd: input.crowd,
    line: input.line,
    cover: input.cover,
    worthIt: input.worthIt,
    tags: input.tags,
    netConfirms: 0,
    role: "public",
  };

  if (supabaseConfigured()) {
    await insertReport(report);
  } else {
    memory.reports.push(report);
  }
  return report;
}

/**
 * Rate limit: one report per venue per reporter per cooldown window, plus a
 * city-wide hourly ceiling. Both are also enforced by a database trigger, which
 * is the real boundary — this check exists to return a helpful message instead
 * of a constraint violation.
 */
export const REPORT_COOLDOWN_MIN = 20;
export const REPORT_HOURLY_LIMIT = 12;

export async function canReport(
  venueId: string,
  reporterId: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; minutesRemaining: number; reason?: "venue" | "hourly" }> {
  const reports = await allReports(now);
  const mine = reports.filter((r) => r.reporterId === reporterId);

  const lastHere = mine
    .filter((r) => r.venueId === venueId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (lastHere) {
    const age = (now.getTime() - new Date(lastHere.createdAt).getTime()) / 60000;
    if (age < REPORT_COOLDOWN_MIN) {
      return {
        allowed: false,
        minutesRemaining: Math.ceil(REPORT_COOLDOWN_MIN - age),
        reason: "venue",
      };
    }
  }

  const lastHour = mine.filter(
    (r) => now.getTime() - new Date(r.createdAt).getTime() < 60 * 60_000
  );
  if (lastHour.length >= REPORT_HOURLY_LIMIT) {
    return { allowed: false, minutesRemaining: 60, reason: "hourly" };
  }

  return { allowed: true, minutesRemaining: 0 };
}

/* ----------------------------------------------------------- shortlists --- */

/** How long a shared shortlist stays open. One night out, not forever. */
export const SHORTLIST_TTL_HOURS = 14;
export const SHORTLIST_MAX_VENUES = 5;
export const SHORTLIST_MIN_VENUES = 2;

/**
 * 20 random characters from a 32-symbol alphabet is about 100 bits. Guessing
 * one is not a threat model anybody needs to worry about, and it keeps the URL
 * short enough to read out loud if someone has to.
 */
export function newShortlistCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function createShortlist(
  venueIds: string[],
  title: string | null,
  now: Date = new Date()
): Promise<Shortlist> {
  const list: Shortlist = {
    code: newShortlistCode(),
    venueIds,
    title,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SHORTLIST_TTL_HOURS * 3_600_000).toISOString(),
  };

  if (supabaseConfigured()) {
    await insertShortlist(list);
  } else {
    memory.shortlists.set(list.code, list);
    memory.votes.set(list.code, []);
  }
  return list;
}

export async function getShortlistTally(
  code: string,
  now: Date = new Date()
): Promise<ShortlistTally | null> {
  const list = supabaseConfigured()
    ? await fetchShortlist(code)
    : (memory.shortlists.get(code) ?? null);
  if (!list) return null;

  const votes = supabaseConfigured()
    ? await fetchShortlistVotes(code)
    : (memory.votes.get(code) ?? []);

  const counts = list.venueIds.map((venueId) => ({
    venueId,
    votes: votes.filter((v) => v.venueId === venueId).length,
  }));

  return {
    shortlist: list,
    counts,
    totalVotes: votes.length,
    expired: new Date(list.expiresAt) <= now,
  };
}

export async function castShortlistVote(
  code: string,
  voterId: string,
  venueId: string,
  now: Date = new Date()
): Promise<ShortlistTally> {
  const tally = await getShortlistTally(code, now);
  if (!tally) throw new Error("That group link does not exist.");
  if (tally.expired) throw new Error("That group link has expired.");
  if (!tally.shortlist.venueIds.includes(venueId)) {
    throw new Error("That venue is not on this shortlist.");
  }

  const vote: ShortlistVote = { code, voterId, venueId, createdAt: now.toISOString() };

  if (supabaseConfigured()) {
    await upsertShortlistVote(vote);
  } else {
    const existing = memory.votes.get(code) ?? [];
    memory.votes.set(code, [...existing.filter((v) => v.voterId !== voterId), vote]);
  }

  return (await getShortlistTally(code, now)) as ShortlistTally;
}

/* ---------------------------------------------------------- corrections --- */

/**
 * A correction has to land somewhere a human will read. When Supabase is
 * configured it is a row; when it is not, it is an in-memory list plus a server
 * log line, and the caller is told which. What it never does is show a
 * thank-you screen while dropping the message.
 */
export async function submitCorrection(input: {
  subjectType: CorrectionInput["subjectType"];
  subjectId: string | null;
  message: string;
  contact: string | null;
}): Promise<{ stored: "database" | "server-log" }> {
  const record: CorrectionInput = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...input,
    createdAt: new Date().toISOString(),
  };

  if (supabaseConfigured()) {
    await insertCorrection(record);
    return { stored: "database" };
  }

  memory.corrections.push(record);
  console.info("[findthecrowd] correction received (no database configured):", record);
  return { stored: "server-log" };
}

/* ------------------------------------------------------------- coverage --- */

export interface CoverageSnapshot {
  venues: number;
  venuesWithFreshReport: number;
  contributorsThisHour: number;
  verifiedEventsTonight: number;
  venuesWithConfirmedHours: number;
  night: PlainDate;
  windowStart: string;
  windowEnd: string;
}

/**
 * What the operator needs to see: where the coverage actually is.
 *
 * This is deliberately unflattering. If nobody has reported anything, every
 * number here is zero and the pilot dashboard says so.
 */
export async function getCoverage(now: Date = new Date()): Promise<CoverageSnapshot> {
  const explore = await getExplore(now);
  const night = nightOf(now);
  const { start, end } = nightWindow(night);
  const events = await getEventsForNights([night], now, { dropFinished: false });

  return {
    venues: explore.rows.length,
    venuesWithFreshReport: explore.rows.filter((r) => r.score.freshness === "live").length,
    contributorsThisHour: explore.contributorsThisHour,
    verifiedEventsTonight: events.filter((e) => e.verified && e.status === "scheduled").length,
    venuesWithConfirmedHours: explore.rows.filter((r) => Boolean(r.venue.hours)).length,
    night,
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
  };
}

export { VENUE_BY_ID, VENUE_BY_SLUG, addDays };

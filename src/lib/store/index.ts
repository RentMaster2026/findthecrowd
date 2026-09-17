import { VENUES, VENUE_BY_SLUG } from "@/data/venues";
import { expandEvents } from "@/data/events";
import { computeVibeScore, rankValue } from "@/lib/score";
import type {
  CrowdReport,
  Venue,
  VenueEvent,
  VenueWithScore,
  VibeScore,
} from "@/lib/types";
import { syntheticReports } from "./synthetic";
import { supabaseConfigured, fetchRecentReports, insertReport } from "./supabase";

/**
 * The data layer.
 *
 * One rule: screens never touch Supabase or the demo generator directly. They
 * call these functions. When the real event feed and venue table land, this file
 * is the only thing that changes.
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

/** In-memory reports submitted this session when no database is configured. */
const sessionReports: CrowdReport[] = [];

export function isLiveBackend(): boolean {
  return supabaseConfigured();
}

async function allReports(now: Date): Promise<CrowdReport[]> {
  if (supabaseConfigured()) {
    return fetchRecentReports();
  }
  return [...syntheticReports(now), ...sessionReports];
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

export async function getTonight(now: Date = new Date()): Promise<VenueWithScore[]> {
  const reports = await allReports(now);
  const byVenue = groupByVenue(reports);
  const events = expandEvents(now, 2);

  const rows: VenueWithScore[] = VENUES.map((venue) => {
    const score = computeVibeScore(byVenue.get(venue.id) ?? [], now);
    const nextEvent =
      events.find((e) => e.venueId === venue.id && new Date(e.endsAt ?? e.startsAt) >= now) ?? null;
    return { venue, score, nextEvent };
  });

  return rows.sort((a, b) => rankValue(b.score) - rankValue(a.score));
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  return VENUE_BY_SLUG.get(slug) ?? null;
}

export interface VenueDetail {
  venue: Venue;
  score: VibeScore;
  reports: CrowdReport[];
  events: VenueEvent[];
}

export async function getVenueDetail(
  slug: string,
  now: Date = new Date()
): Promise<VenueDetail | null> {
  const venue = VENUE_BY_SLUG.get(slug);
  if (!venue) return null;

  const reports = (await allReports(now))
    .filter((r) => r.venueId === venue.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    venue,
    score: computeVibeScore(reports, now),
    reports: reports.slice(0, 25),
    events: expandEvents(now, 7).filter((e) => e.venueId === venue.id),
  };
}

export async function getEvents(now: Date = new Date()): Promise<
  { event: VenueEvent; venue: Venue; score: VibeScore }[]
> {
  const reports = await allReports(now);
  const byVenue = groupByVenue(reports);
  const scoreCache = new Map<string, VibeScore>();

  return expandEvents(now, 7)
    .map((event) => {
      const venue = VENUES.find((v) => v.id === event.venueId);
      if (!venue) return null;
      let score = scoreCache.get(venue.id);
      if (!score) {
        score = computeVibeScore(byVenue.get(venue.id) ?? [], now);
        scoreCache.set(venue.id, score);
      }
      return { event, venue, score };
    })
    .filter((x): x is { event: VenueEvent; venue: Venue; score: VibeScore } => x !== null);
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
  const events = expandEvents(now, 2);

  return slugs
    .map((slug) => {
      const venue = VENUE_BY_SLUG.get(slug);
      if (!venue) return null;
      const score = computeVibeScore(byVenue.get(venue.id) ?? [], now);
      const nextEvent =
        events.find((e) => e.venueId === venue.id && new Date(e.endsAt ?? e.startsAt) >= now) ??
        null;
      return { venue, score, nextEvent };
    })
    .filter((row): row is VenueWithScore => row !== null);
}

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
  };

  if (supabaseConfigured()) {
    await insertReport(report);
  } else {
    sessionReports.push(report);
  }
  return report;
}

/**
 * Rate limit: one report per venue per reporter per cooldown window. Stops a
 * promoter refreshing their own score and stops honest double-taps.
 */
export const REPORT_COOLDOWN_MIN = 20;

export async function canReport(
  venueId: string,
  reporterId: string,
  now: Date = new Date()
): Promise<{ allowed: boolean; minutesRemaining: number }> {
  const reports = await allReports(now);
  const last = reports
    .filter((r) => r.venueId === venueId && r.reporterId === reporterId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (!last) return { allowed: true, minutesRemaining: 0 };

  const age = (now.getTime() - new Date(last.createdAt).getTime()) / 60000;
  if (age >= REPORT_COOLDOWN_MIN) return { allowed: true, minutesRemaining: 0 };
  return { allowed: false, minutesRemaining: Math.ceil(REPORT_COOLDOWN_MIN - age) };
}

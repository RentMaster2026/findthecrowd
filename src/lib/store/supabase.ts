import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  CrowdReport,
  EventPrice,
  ReporterRole,
  Shortlist,
  ShortlistVote,
  VenueEvent,
} from "@/lib/types";
import type { PlainDate } from "@/lib/time";
import { WINDOW_MIN } from "@/lib/score";

/**
 * Supabase adapter.
 *
 * Absent env vars is a supported state, not an error: the app falls back to a
 * local dataset so a new developer can run it in one command. The moment
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY exist, every read
 * and write goes to Postgres instead.
 *
 * Failure policy, which matters more than it sounds: a read failure degrades to
 * "no signal" and never 500s the feed, but a WRITE failure is surfaced to the
 * caller. Swallowing a failed write would show someone a thank-you screen for a
 * report that was never saved, and that is the one lie this product cannot
 * afford.
 */

let cached: SupabaseClient | null = null;

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getClient(): SupabaseClient {
  if (!supabaseConfigured()) {
    throw new Error("Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_* env vars.");
  }
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { auth: { persistSession: false } }
    );
  }
  return cached;
}

/**
 * A missing table means a migration has not been applied. That is an
 * operational fact the caller must be able to report precisely instead of
 * showing a generic failure or, worse, a fake success.
 */
export class MigrationMissingError extends Error {
  constructor(public readonly table: string, public readonly migration: string) {
    super(`Table "${table}" is missing. Apply ${migration} in the Supabase SQL editor.`);
    this.name = "MigrationMissingError";
  }
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // PostgREST reports an unknown relation as 42P01 / PGRST205.
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("does not exist"))
  );
}

/* -------------------------------------------------------------- reports --- */

interface ReportRow {
  id: string;
  venue_id: string;
  reporter_id: string;
  created_at: string;
  crowd: number;
  line: string;
  cover: number | null;
  worth_it: boolean;
  tags: string[] | null;
  net_confirms: number | null;
  role: string | null;
}

function reportFromRow(row: ReportRow): CrowdReport {
  return {
    id: row.id,
    venueId: row.venue_id,
    reporterId: row.reporter_id,
    createdAt: row.created_at,
    crowd: row.crowd as CrowdReport["crowd"],
    line: row.line as CrowdReport["line"],
    cover: row.cover,
    worthIt: row.worth_it,
    tags: (row.tags ?? []) as CrowdReport["tags"],
    netConfirms: row.net_confirms ?? 0,
    role: (row.role ?? "public") as ReporterRole,
  };
}

/** Every report inside the scoring window, across all venues. One round trip. */
export async function fetchRecentReports(): Promise<CrowdReport[]> {
  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
  const { data, error } = await getClient()
    .from("crowd_reports")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    // A read failure should degrade to "no signal", never a 500 on the feed.
    console.error("[findthecrowd] fetchRecentReports failed:", error.message);
    return [];
  }
  return (data as ReportRow[]).map(reportFromRow);
}

export async function insertReport(report: CrowdReport): Promise<void> {
  const { error } = await getClient().from("crowd_reports").insert({
    id: report.id,
    venue_id: report.venueId,
    reporter_id: report.reporterId,
    created_at: report.createdAt,
    crowd: report.crowd,
    line: report.line,
    cover: report.cover,
    worth_it: report.worthIt,
    tags: report.tags,
    net_confirms: 0,
    role: report.role ?? "public",
  });
  if (error) throw new Error(`Could not save report: ${error.message}`);
}

/* --------------------------------------------------------------- events --- */

interface EventRow {
  id: string;
  venue_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  night_of: string;
  category: string;
  price_kind: string | null;
  price: number | null;
  ticket_url: string | null;
  source_label: string;
  source_url: string | null;
  checked_at: string | null;
  status: string | null;
  note: string | null;
}

function priceFromRow(row: EventRow): EventPrice {
  if (row.price_kind === "free") return { kind: "free" };
  if (row.price_kind === "amount" && row.price !== null) {
    return { kind: "amount", cad: row.price };
  }
  return { kind: "unknown" };
}

/**
 * Operator-entered events for the given nights.
 *
 * Only rows with a real supporting URL and a checked date come back verified;
 * anything else is dropped rather than shown, because an unverified row in the
 * events table is indistinguishable to a reader from a checked one.
 */
export async function fetchEvents(nights: PlainDate[]): Promise<VenueEvent[]> {
  const { data, error } = await getClient()
    .from("events")
    .select("*")
    .in("night_of", nights)
    .order("starts_at", { ascending: true })
    .limit(500);

  if (error) {
    if (!isMissingTable(error)) {
      console.error("[findthecrowd] fetchEvents failed:", error.message);
    }
    return [];
  }

  return (data as EventRow[])
    .filter((row) => Boolean(row.source_url) && Boolean(row.checked_at))
    .map((row) => ({
      id: row.id,
      venueId: row.venue_id,
      title: row.title,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      nightOf: row.night_of,
      category: row.category as VenueEvent["category"],
      price: priceFromRow(row),
      ticketUrl: row.ticket_url,
      source: {
        label: row.source_label,
        url: row.source_url as string,
        checkedAt: row.checked_at as string,
      },
      status: (row.status ?? "scheduled") as VenueEvent["status"],
      verified: true,
      note: row.note ?? undefined,
    }));
}

/* ----------------------------------------------------------- shortlists --- */

const SHORTLIST_MIGRATION = "supabase/migrations/002_shortlists_and_corrections.sql";

export async function insertShortlist(list: Shortlist): Promise<void> {
  const { error } = await getClient().from("shortlists").insert({
    code: list.code,
    venue_ids: list.venueIds,
    title: list.title,
    created_at: list.createdAt,
    expires_at: list.expiresAt,
  });
  if (error) {
    if (isMissingTable(error)) throw new MigrationMissingError("shortlists", SHORTLIST_MIGRATION);
    throw new Error(`Could not create that shortlist: ${error.message}`);
  }
}

export async function fetchShortlist(code: string): Promise<Shortlist | null> {
  const { data, error } = await getClient()
    .from("shortlists")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) throw new MigrationMissingError("shortlists", SHORTLIST_MIGRATION);
    throw new Error(`Could not load that shortlist: ${error.message}`);
  }
  if (!data) return null;

  return {
    code: data.code,
    venueIds: data.venue_ids ?? [],
    title: data.title ?? null,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

export async function fetchShortlistVotes(code: string): Promise<ShortlistVote[]> {
  const { data, error } = await getClient()
    .from("shortlist_votes")
    .select("*")
    .eq("code", code)
    .limit(2000);

  if (error) {
    if (isMissingTable(error)) throw new MigrationMissingError("shortlist_votes", SHORTLIST_MIGRATION);
    throw new Error(`Could not load votes: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    code: row.code,
    voterId: row.voter_id,
    venueId: row.venue_id,
    createdAt: row.created_at,
  }));
}

/**
 * One vote per voter per shortlist, changeable. Upsert on (code, voter_id) is
 * the whole rule — it makes a re-vote a replacement rather than a second vote,
 * in one round trip, enforced by a primary key rather than by the client.
 */
export async function upsertShortlistVote(vote: ShortlistVote): Promise<void> {
  const { error } = await getClient()
    .from("shortlist_votes")
    .upsert(
      {
        code: vote.code,
        voter_id: vote.voterId,
        venue_id: vote.venueId,
        created_at: vote.createdAt,
      },
      { onConflict: "code,voter_id" }
    );
  if (error) {
    if (isMissingTable(error)) throw new MigrationMissingError("shortlist_votes", SHORTLIST_MIGRATION);
    throw new Error(`Could not record that vote: ${error.message}`);
  }
}

/* ---------------------------------------------------------- corrections --- */

export interface CorrectionInput {
  id: string;
  subjectType: "venue" | "event" | "other";
  subjectId: string | null;
  message: string;
  contact: string | null;
  createdAt: string;
}

export async function insertCorrection(input: CorrectionInput): Promise<void> {
  const { error } = await getClient().from("corrections").insert({
    id: input.id,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    message: input.message,
    contact: input.contact,
    created_at: input.createdAt,
  });
  if (error) {
    if (isMissingTable(error)) throw new MigrationMissingError("corrections", SHORTLIST_MIGRATION);
    throw new Error(`Could not send that correction: ${error.message}`);
  }
}

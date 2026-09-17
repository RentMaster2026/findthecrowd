import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CrowdReport } from "@/lib/types";
import { WINDOW_MIN } from "@/lib/score";

/**
 * Supabase adapter.
 *
 * Absent env vars is a supported state, not an error: the app falls back to the
 * local demo dataset so a new developer can run it in one command. The moment
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY exist, every read
 * and write goes to Postgres instead.
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
}

function fromRow(row: ReportRow): CrowdReport {
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
  return (data as ReportRow[]).map(fromRow);
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
  });
  if (error) throw new Error(`Could not save report: ${error.message}`);
}

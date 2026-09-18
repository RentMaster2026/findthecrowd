import { NextResponse } from "next/server";
import { MigrationMissingError, castShortlistVote, getShortlistTally } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Matches `newShortlistCode`: 20 characters from an unambiguous alphabet. */
const CODE_RE = /^[a-hjkmnp-z2-9]{20}$/;
const VOTER_RE = /^v_[a-z0-9_]{6,60}$/i;

/**
 * Cast or change a vote.
 *
 * The rules, all enforced here rather than in the browser:
 *   - The code must look like a code before it reaches the database.
 *   - The venue must be on this shortlist. Voting for something that is not on
 *     the ballot is not a vote.
 *   - An expired link accepts nothing. It returns the tally so the page can
 *     show what the group decided, marked expired, rather than silently
 *     presenting last night's plan as tonight's.
 *   - One vote per voter, changeable. That is a primary key on
 *     (code, voter_id), so a replay adds nothing.
 *
 * A group vote is a statement about where people WANT to go. It is written to
 * its own table, is never read by the scoring engine, and can never raise a
 * venue's crowd figures. There is a test for exactly that.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "That group link is not valid." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const voterId = typeof b.voterId === "string" ? b.voterId.slice(0, 64) : "";
  const venueId = typeof b.venueId === "string" ? b.venueId : "";

  if (!VOTER_RE.test(voterId)) {
    return NextResponse.json({ error: "Missing a valid voter id." }, { status: 400 });
  }
  if (!venueId) {
    return NextResponse.json({ error: "Pick one of the options." }, { status: 400 });
  }

  try {
    const tally = await castShortlistVote(code, voterId, venueId);
    return NextResponse.json({ ok: true, tally });
  } catch (err) {
    if (err instanceof MigrationMissingError) {
      console.error("[findthecrowd]", err.message);
      return NextResponse.json(
        { error: "Group voting is not switched on for this deployment yet." },
        { status: 503 }
      );
    }
    const message = err instanceof Error ? err.message : "Could not record that vote.";
    const expired = message.includes("expired");
    return NextResponse.json({ error: message }, { status: expired ? 410 : 400 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "That group link is not valid." }, { status: 400 });
  }

  try {
    const tally = await getShortlistTally(code);
    if (!tally) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true, tally });
  } catch {
    return NextResponse.json({ error: "Could not load that shortlist." }, { status: 500 });
  }
}

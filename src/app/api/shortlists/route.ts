import { NextResponse } from "next/server";
import { VENUE_BY_ID } from "@/data/venues";
import {
  MigrationMissingError,
  SHORTLIST_MAX_VENUES,
  SHORTLIST_MIN_VENUES,
  createShortlist,
} from "@/lib/store";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Create a shortlist.
 *
 * Validation happens here because the client is the attacker's machine. Venue
 * ids are checked against the directory, the count is bounded at both ends, and
 * the title is length-capped. Nothing about the creator is stored: no id, no
 * name, no address. A shortlist is a code, some venue ids and an expiry.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.venueIds)) {
    return NextResponse.json({ error: "Pick some places first." }, { status: 400 });
  }

  const venueIds = [...new Set(b.venueIds.filter((id): id is string => typeof id === "string"))];

  if (venueIds.length < SHORTLIST_MIN_VENUES) {
    return NextResponse.json(
      { error: `Pick at least ${SHORTLIST_MIN_VENUES} places.` },
      { status: 400 }
    );
  }
  if (venueIds.length > SHORTLIST_MAX_VENUES) {
    return NextResponse.json(
      { error: `A shortlist holds at most ${SHORTLIST_MAX_VENUES} places.` },
      { status: 400 }
    );
  }
  if (venueIds.some((id) => !VENUE_BY_ID.has(id))) {
    return NextResponse.json({ error: "One of those places is not in the directory." }, { status: 400 });
  }

  const title =
    typeof b.title === "string" && b.title.trim() ? b.title.trim().slice(0, 60) : null;

  try {
    const list = await createShortlist(venueIds, title);
    return NextResponse.json({
      ok: true,
      code: list.code,
      url: `${SITE_URL}/g/${list.code}`,
      expiresAt: list.expiresAt,
    });
  } catch (err) {
    if (err instanceof MigrationMissingError) {
      // Say exactly what is missing rather than failing vaguely. An operator
      // reading this knows what to run; a user is told it is not available yet
      // rather than being shown a link that will not work.
      console.error("[findthecrowd]", err.message);
      return NextResponse.json(
        {
          error:
            "Group links are not switched on for this deployment yet. The database migration has not been applied.",
        },
        { status: 503 }
      );
    }
    const message = err instanceof Error ? err.message : "Could not create that link.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

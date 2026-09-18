import { NextResponse } from "next/server";
import { VENUE_BY_ID } from "@/data/venues";
import { REPORT_COOLDOWN_MIN, REPORT_HOURLY_LIMIT, canReport, submitReport } from "@/lib/store";
import { ALL_TAGS } from "@/lib/labels";
import type { CrowdLevel, LineLength, VibeTag } from "@/lib/types";

export const dynamic = "force-dynamic";

const LINES: LineLength[] = ["none", "short", "long", "brutal"];

/**
 * Validate on the server, always. The report sheet is a convenience; this is
 * the boundary. Anything that fails validation is a 400 with a sentence a human
 * could act on, not a stack trace.
 *
 * Note the two different 429 messages. "You already reported here" and "that is
 * a lot of reports from one device" are different situations and a person hitting
 * the first one has done nothing wrong.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const venueId = typeof b.venueId === "string" ? b.venueId : "";
  if (!VENUE_BY_ID.has(venueId)) {
    return NextResponse.json({ error: "Unknown venue." }, { status: 400 });
  }

  const reporterId = typeof b.reporterId === "string" ? b.reporterId.slice(0, 64) : "";
  if (!/^d_[a-z0-9_]{6,60}$/i.test(reporterId)) {
    return NextResponse.json({ error: "Missing a valid reporter id." }, { status: 400 });
  }

  if (typeof b.worthIt !== "boolean") {
    return NextResponse.json({ error: "Tell us whether it's worth coming." }, { status: 400 });
  }

  const crowd = Number(b.crowd);
  if (!Number.isInteger(crowd) || crowd < 1 || crowd > 5) {
    return NextResponse.json({ error: "Pick how busy it is." }, { status: 400 });
  }

  const line = LINES.includes(b.line as LineLength) ? (b.line as LineLength) : "none";

  let cover: number | null = null;
  if (b.cover !== null && b.cover !== undefined) {
    const n = Number(b.cover);
    if (!Number.isFinite(n) || n < 0 || n > 200) {
      return NextResponse.json({ error: "That cover charge doesn't look right." }, { status: 400 });
    }
    cover = Math.round(n);
  }

  const tags = Array.isArray(b.tags)
    ? (b.tags.filter((t) => ALL_TAGS.includes(t as VibeTag)) as VibeTag[]).slice(0, 3)
    : [];

  const gate = await canReport(venueId, reporterId);
  if (!gate.allowed) {
    return NextResponse.json(
      {
        error:
          gate.reason === "hourly"
            ? `That's ${REPORT_HOURLY_LIMIT} updates from this device in an hour, which is our limit. Try again later.`
            : `You already reported here. You can update it again in ${gate.minutesRemaining} min.`,
      },
      { status: 429 }
    );
  }

  try {
    const report = await submitReport({
      venueId,
      reporterId,
      crowd: crowd as CrowdLevel,
      line,
      cover,
      worthIt: b.worthIt,
      tags,
    });
    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (err) {
    // The database trigger is the real gate and it can reject a request that
    // passed the check above, because two requests can race. Its message is
    // translated here rather than leaked as a constraint violation.
    const message = err instanceof Error ? err.message : "Could not save that update.";
    if (message.includes("cooldown")) {
      return NextResponse.json(
        {
          error: `You already reported here. You can update it again in ${REPORT_COOLDOWN_MIN} min.`,
        },
        { status: 429 }
      );
    }
    console.error("[findthecrowd] report insert failed:", message);
    return NextResponse.json(
      { error: "We could not save that update. Nothing was recorded, so please try again." },
      { status: 500 }
    );
  }
}

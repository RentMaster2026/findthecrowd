import { NextResponse } from "next/server";
import { MigrationMissingError, submitCorrection } from "@/lib/store";

export const dynamic = "force-dynamic";

const TYPES = ["venue", "event", "other"] as const;

/**
 * Corrections.
 *
 * The link on every venue page used to point at the scoring explainer, which
 * had no form and no contact route on it, so "tell us if something is wrong"
 * went nowhere. This is the smallest thing that actually receives a message
 * using the stack already here: a row in Postgres.
 *
 * The response says WHERE it landed. When no database is configured the
 * correction goes to the server log, and the caller is told that rather than
 * shown a thank-you for a message nobody will read. No support inbox is
 * invented anywhere in this flow.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const subjectType = TYPES.includes(b.subjectType as (typeof TYPES)[number])
    ? (b.subjectType as (typeof TYPES)[number])
    : "other";

  const message = typeof b.message === "string" ? b.message.trim() : "";
  if (message.length < 10) {
    return NextResponse.json(
      { error: "Tell us a bit more about what is wrong (at least 10 characters)." },
      { status: 400 }
    );
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "That message is too long." }, { status: 400 });
  }

  const subjectId =
    typeof b.subjectId === "string" && b.subjectId.trim()
      ? b.subjectId.trim().slice(0, 120)
      : null;

  // Contact is optional and stays optional. Somebody reporting a wrong opening
  // time should not have to hand over an email address to do it.
  const contact =
    typeof b.contact === "string" && b.contact.trim() ? b.contact.trim().slice(0, 200) : null;

  try {
    const { stored } = await submitCorrection({ subjectType, subjectId, message, contact });
    return NextResponse.json({ ok: true, stored });
  } catch (err) {
    if (err instanceof MigrationMissingError) {
      console.error("[findthecrowd]", err.message);
      return NextResponse.json(
        {
          error:
            "We could not save that. The corrections table has not been created on this deployment yet, so nothing was recorded.",
        },
        { status: 503 }
      );
    }
    const message = err instanceof Error ? err.message : "Could not send that correction.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

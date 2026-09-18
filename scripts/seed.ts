/**
 * Load the Ottawa venue set and the VERIFIED events into Supabase.
 *
 *   1. Run supabase/schema.sql in the Supabase SQL editor.
 *   2. Run supabase/migrations/002_shortlists_and_corrections.sql.
 *   3. Put NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   4. npm run seed
 *
 * Safe to re-run: everything upserts on primary key.
 *
 * It seeds only events that carry a source URL and a checked-at date. The
 * unverified sample fixtures are deliberately left out: putting them in the
 * database is how an unchecked listing ends up looking like a checked one.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { VENUES } from "../src/data/venues.ts";
import { eventsForNights, upcomingNights } from "../src/data/events.ts";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      /* file is optional */
    }
  }
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Copy .env.example to .env.local and fill them in."
    );
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const venueRows = VENUES.map((v) => ({
    id: v.id,
    slug: v.slug,
    name: v.name,
    kind: v.kind,
    district: v.district,
    address: v.address,
    lat: v.lat,
    lng: v.lng,
    blurb: v.blurb,
    capacity_band: v.capacityBand,
    typical_cover: v.typicalCover,
    age_policy: v.agePolicy,
  }));

  const { error: venueError } = await db.from("venues").upsert(venueRows);
  if (venueError) throw new Error(`venues: ${venueError.message}`);
  console.log(`Seeded ${venueRows.length} venues.`);

  const now = new Date();
  const eventRows = eventsForNights(upcomingNights(now, 28), now)
    .filter((e) => e.verified && e.source.url)
    .map((e) => ({
      id: e.id,
      venue_id: e.venueId,
      title: e.title,
      starts_at: e.startsAt,
      ends_at: e.endsAt,
      night_of: e.nightOf,
      category: e.category,
      price_kind: e.price.kind,
      price: e.price.kind === "amount" ? e.price.cad : null,
      ticket_url: e.ticketUrl,
      source_label: e.source.label,
      source_url: e.source.url,
      checked_at: e.source.checkedAt,
      status: e.status,
      note: e.note ?? null,
    }));

  const { error: eventError } = await db.from("events").upsert(eventRows);
  if (eventError) throw new Error(`events: ${eventError.message}`);
  console.log(`Seeded ${eventRows.length} verified events for the next 28 nights.`);

  if (eventRows.length < 10) {
    console.log(
      "\nThat is a thin calendar, and it is thin because almost nothing has been\n" +
        "verified against a venue's own page yet. See docs/PILOT.md and\n" +
        "docs/DATA-CHANGES.md for the list waiting to be checked."
    );
  }

  console.log("\nDone. Reports stay empty — those come from real people.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

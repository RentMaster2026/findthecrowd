/**
 * Load the Ottawa venue set and a week of events into Supabase.
 *
 *   1. Run supabase/schema.sql in the Supabase SQL editor.
 *   2. Put NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   3. npm run seed
 *
 * Safe to re-run: everything upserts on primary key.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { VENUES } from "../src/data/venues.ts";
import { expandEvents } from "../src/data/events.ts";

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

  const eventRows = expandEvents(new Date(), 14).map((e) => ({
    id: e.id,
    venue_id: e.venueId,
    title: e.title,
    starts_at: e.startsAt,
    ends_at: e.endsAt,
    category: e.category,
    price: e.price,
    ticket_url: e.ticketUrl,
    source: e.source,
  }));

  const { error: eventError } = await db.from("events").upsert(eventRows);
  if (eventError) throw new Error(`events: ${eventError.message}`);
  console.log(`Seeded ${eventRows.length} events for the next 14 days.`);

  console.log("\nDone. Reports stay empty — those come from real people.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

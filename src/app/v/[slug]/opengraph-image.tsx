import { ImageResponse } from "next/og";
import { VENUE_BY_SLUG } from "@/data/venues";
import { DISTRICT_LABEL, KIND_LABEL } from "@/lib/labels";

export const alt = "A place to go out in Ottawa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Venue-specific link preview.
 *
 * Deliberately carries no crowd figure. Every messaging app caches the card it
 * renders, sometimes for days, so a number baked in here would still be
 * claiming "82% say go" on Sunday afternoon for a Friday night. The preview
 * describes the place, which stays true; the live number lives on the page,
 * where it is timestamped and can age honestly.
 */
export default async function VenueOpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const venue = VENUE_BY_SLUG.get(params.slug);

  const name = venue?.name ?? "Find the Crowd";
  const line = venue
    ? `${KIND_LABEL[venue.kind]} · ${DISTRICT_LABEL[venue.district]}`
    : "Ottawa nightlife";
  const blurb = venue?.blurb ?? "What is actually good in Ottawa tonight.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0b",
          padding: 72,
          fontFamily: "sans-serif",
          color: "#f4f3f1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 24, height: 24, background: "#ff3b14" }} />
          <div style={{ display: "flex", gap: 10, fontSize: 30, fontWeight: 700 }}>
            <span>Find the</span>
            <span style={{ color: "#ff3b14" }}>Crowd</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 78, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
            {name}
          </div>
          <div style={{ fontSize: 34, color: "#a8a8b0" }}>{line}</div>
          <div style={{ fontSize: 28, color: "#a8a8b0", maxWidth: 900 }}>{blurb}</div>
        </div>

        <div style={{ fontSize: 26, color: "#71717a" }}>
          Crowd updates from people already inside. Ottawa.
        </div>
      </div>
    ),
    size
  );
}

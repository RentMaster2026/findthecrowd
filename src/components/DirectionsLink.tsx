"use client";

import { track } from "@/lib/analytics";
import type { Venue } from "@/lib/types";

/**
 * Directions.
 *
 * An external maps link rather than an embedded map on purpose: a map tile
 * bundle is the heaviest thing this page could load, the phone already has a
 * maps app that knows about transit and traffic, and the link works offline
 * once it has opened. Deferring the map is in the MVP plan; a reliable link is
 * what ships.
 *
 * The click is tracked as `directions_clicked`. It is not a visit. Nobody has
 * gone anywhere at the moment they tap a link to a map.
 */
export function DirectionsLink({ venue }: { venue: Venue }) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venue.name}, ${venue.address}, Ottawa`
  )}`;

  return (
    <a
      className="btn btn-ghost"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("directions_clicked", { venueId: venue.id })}
    >
      {venue.address} · Directions
    </a>
  );
}

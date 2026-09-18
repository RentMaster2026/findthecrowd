"use client";

import { useId, useMemo, useState } from "react";
import { ReportSheet } from "./ReportSheet";
import { DISTRICT_LABEL, KIND_LABEL, relativeTime } from "@/lib/labels";
import type { District, VenueKind } from "@/lib/types";

export interface PickerVenue {
  id: string;
  slug: string;
  name: string;
  district: District;
  kind: VenueKind;
  /** Minutes since the last qualifying report, or null when there are none. */
  lastReportMinutes: number | null;
}

/**
 * "Which venue are you at?"
 *
 * The heading is the thing that was wrong here. It read "Busiest right now"
 * over a list of venues while the homepage said zero reports this hour — a
 * ranking claim with nothing behind it. A comparative heading needs evidence,
 * so the server decides which heading applies and this component just renders
 * what it is given.
 *
 * Search stays a plain text filter over name and neighbourhood. No location
 * permission is requested anywhere in this flow.
 */
export function VenuePicker({
  venues,
  heading,
  ranked,
}: {
  venues: PickerVenue[];
  heading: string;
  /** True when the order means something. When false the list is alphabetical. */
  ranked: boolean;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<PickerVenue | null>(null);
  const searchId = useId();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues.slice(0, 12);
    return venues
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          DISTRICT_LABEL[v.district].toLowerCase().includes(q) ||
          KIND_LABEL[v.kind].toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query, venues]);

  return (
    <>
      <label className="sr-only" htmlFor={searchId}>
        Search venues by name or neighbourhood
      </label>
      <input
        id={searchId}
        type="search"
        className="search-input search-input-block"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for where you are"
        autoComplete="off"
      />

      <div className="section-head">
        <h2>{query ? "Matches" : heading}</h2>
      </div>

      {results.length === 0 && (
        <div className="empty">
          <p>No match for that.</p>
          <p className="empty-sub">
            If the place is missing, tell us and we will add it.{" "}
            <a href="/corrections?type=venue" className="inline-link">
              Report a missing venue
            </a>
          </p>
        </div>
      )}

      {results.map((v) => (
        <button
          key={v.id}
          type="button"
          className="card picker-row"
          onClick={() => setPicked(v)}
        >
          <span className="card-body">
            <span className="venue-name">{v.name}</span>
            <span className="venue-meta">
              {KIND_LABEL[v.kind]} · {DISTRICT_LABEL[v.district]}
            </span>
          </span>
          {ranked && v.lastReportMinutes !== null && (
            <span className="chip">Last update {relativeTime(v.lastReportMinutes)}</span>
          )}
        </button>
      ))}

      {picked && (
        <ReportSheet
          venueId={picked.id}
          venueSlug={picked.slug}
          venueName={picked.name}
          venueKind={picked.kind}
          onClose={() => setPicked(null)}
        />
      )}
    </>
  );
}

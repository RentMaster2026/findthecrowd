"use client";

import { useMemo, useState } from "react";
import { ReportSheet } from "./ReportSheet";
import { DISTRICT_LABEL, KIND_LABEL } from "@/lib/labels";
import type { District, VenueKind } from "@/lib/types";

interface PickerVenue {
  id: string;
  slug: string;
  name: string;
  district: District;
  kind: VenueKind;
  live: boolean;
}

export function VenuePicker({ venues }: { venues: PickerVenue[] }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<PickerVenue | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues.slice(0, 12);
    return venues
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          DISTRICT_LABEL[v.district].toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [query, venues]);

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search venues"
        aria-label="Search venues"
        style={{
          width: "100%",
          minHeight: 48,
          padding: "12px 14px",
          fontSize: 16,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          color: "var(--text)",
          marginBottom: 16,
        }}
      />

      {!query && (
        <div className="section-head" style={{ marginTop: 0 }}>
          <h2>Busiest right now</h2>
        </div>
      )}

      {results.length === 0 && (
        <div className="empty">
          No match. Venue missing? Submitting new venues lands in the next build.
        </div>
      )}

      {results.map((v) => (
        <button
          key={v.id}
          className="card"
          style={{ width: "100%", textAlign: "left", border: "1px solid var(--line)" }}
          onClick={() => setPicked(v)}
        >
          <div className="card-row" style={{ alignItems: "center" }}>
            <div className="card-body">
              <div className="venue-name">{v.name}</div>
              <div className="venue-meta">
                {KIND_LABEL[v.kind]} · {DISTRICT_LABEL[v.district]}
              </div>
            </div>
            {v.live && (
              <span className="chip" data-tone="live">
                <span className="pulse" />
                Live
              </span>
            )}
          </div>
        </button>
      ))}

      {picked && (
        <ReportSheet
          venueId={picked.id}
          venueName={picked.name}
          venueKind={picked.kind}
          onClose={() => setPicked(null)}
        />
      )}
    </>
  );
}

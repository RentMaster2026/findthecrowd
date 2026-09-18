"use client";

import { useState } from "react";
import { ReportSheet } from "./ReportSheet";
import type { VenueKind } from "@/lib/types";

export function ReportButton({
  venueId,
  venueSlug,
  venueName,
  venueKind,
  label = "I'm here, add an update",
  ghost = false,
}: {
  venueId: string;
  venueSlug?: string;
  venueName: string;
  venueKind: VenueKind;
  label?: string;
  ghost?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={ghost ? "btn btn-ghost" : "btn"} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <ReportSheet
          venueId={venueId}
          venueSlug={venueSlug}
          venueName={venueName}
          venueKind={venueKind}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

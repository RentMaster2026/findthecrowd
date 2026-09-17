"use client";

import { useState } from "react";
import { ReportSheet } from "./ReportSheet";
import type { VenueKind } from "@/lib/types";

export function ReportButton({
  venueId,
  venueName,
  venueKind,
  label = "I'm here, report the vibe",
  ghost = false,
}: {
  venueId: string;
  venueName: string;
  venueKind: VenueKind;
  label?: string;
  ghost?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={ghost ? "btn btn-ghost" : "btn"} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open && (
        <ReportSheet
          venueId={venueId}
          venueName={venueName}
          venueKind={venueKind}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

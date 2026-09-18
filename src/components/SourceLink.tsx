"use client";

import { track } from "@/lib/analytics";
import { formatNightShort } from "@/lib/time";
import type { SourceRef } from "@/lib/types";

/**
 * Provenance, as a link somebody can actually follow.
 *
 * The old cards said "via Venue listing" and linked to the venue page inside
 * this app, which is not a source — it is the same claim on a different screen.
 * A source line has to point at the page that supports the claim and say when a
 * human last looked at it, or it is decoration.
 */
export function SourceLink({ source }: { source: SourceRef }) {
  if (!source.url) {
    return (
      <p className="source-line">
        Source not verified. This listing has no supporting page yet.
      </p>
    );
  }

  let host = source.url;
  try {
    host = new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    /* Leave the raw string; a malformed URL is still worth showing. */
  }

  return (
    <p className="source-line">
      Source:{" "}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="source-anchor"
        onClick={() => track("source_link_clicked", { host })}
      >
        {source.label}
      </a>
      {source.checkedAt && <> · checked {formatNightShort(source.checkedAt)}</>}
    </p>
  );
}

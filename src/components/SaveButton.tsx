"use client";

import { track } from "@/lib/analytics";
import { useSaved } from "@/lib/saved";

/**
 * Save a venue to the local shortlist.
 *
 * Renders its unsaved state until the browser's saved list has been read, so
 * the server-rendered markup and the first client render agree. The alternative
 * is a hydration mismatch and a visible flicker on every card in the feed.
 *
 * Inside a feed card the whole card is a link, so this button stops the click
 * from bubbling into a navigation the person did not ask for.
 */
export function SaveButton({
  venueId,
  venueName,
  variant = "icon",
}: {
  venueId: string;
  venueName: string;
  variant?: "icon" | "full";
}) {
  const { hydrated, isSaved, toggle } = useSaved();
  const saved = hydrated && isSaved(venueId);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(venueId);
    if (!saved) track("venue_saved", { venueId });
  }

  const label = saved ? `Remove ${venueName} from saved` : `Save ${venueName}`;

  if (variant === "full") {
    return (
      <button type="button" className="btn btn-ghost" onClick={onClick} aria-pressed={saved}>
        <BookmarkIcon filled={saved} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      data-on={saved}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

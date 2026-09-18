import { GUIDES } from "./guides";

/**
 * Editorial picks.
 *
 * When nobody has reported anything yet, the honest alternatives are verified
 * events and a short researched list — not a grid of unknown scores. These come
 * from the guides, which already name real places and say why in a sentence, so
 * there is one set of opinions in the codebase rather than two that can drift.
 *
 * Everywhere these render they are labelled as editorial. They are somebody's
 * opinion about the city, they do not change with tonight's reports, and
 * presenting them as anything else would be the same failure as inventing a
 * score.
 */

export interface EditorialPick {
  venueSlug: string;
  /** Why this place, in the guide author's words. */
  note: string;
  /** Which guide it came from, so the claim is traceable. */
  guideSlug: string;
  guideTitle: string;
}

/**
 * A handful of picks for the nights-out guide, in guide order.
 *
 * Deliberately capped. The empty state is meant to give someone two or three
 * usable options and get out of the way, not to reprint the guide.
 */
export function editorialPicks(limit = 4): EditorialPick[] {
  const guide = GUIDES.find((g) => g.slug === "best-places-to-go-out-in-ottawa");
  if (!guide) return [];

  const picks: EditorialPick[] = [];
  // One per section, so the list spans neighbourhoods instead of listing five
  // doors on the same street.
  for (const section of guide.sections) {
    const entry = section.entries[0];
    if (!entry) continue;
    picks.push({
      venueSlug: entry.venueSlug,
      note: entry.note,
      guideSlug: guide.slug,
      guideTitle: guide.title,
    });
    if (picks.length >= limit) break;
  }
  return picks;
}

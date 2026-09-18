"use client";

/**
 * Minimal analytics.
 *
 * What this is careful about is the NAMES. The point of measuring a pilot is to
 * find out whether the thing works, and a metric that flatters the product
 * answers the wrong question. So:
 *
 *   - Opening the OS share sheet is `share_sheet_opened`, not `share`. Most
 *     share sheets get dismissed. We only know a link left the device when the
 *     copy fallback resolves, which is `share_link_copied`.
 *   - A click on Directions is `directions_clicked`, never a visit. Nobody has
 *     been anywhere; they tapped a link to a map.
 *   - A returning browser is `return_visit_browser`, not a returning user. An
 *     anonymous id in localStorage is a browser. It is cleared by a private
 *     window, a new phone or a cleared cache, and it is not a person.
 *   - `report_submitted` fires only after the server accepts. `report_started`
 *     fires when the sheet opens. The ratio between them is the funnel; firing
 *     the second one optimistically would make the funnel a fiction.
 *
 * Transport: a `window.plausible`-style queue if one exists, otherwise a
 * console line in development and nothing in production. There is no vendor
 * dependency here, and no personal data in any payload — the only identifier
 * that ever leaves is the anonymous browser id, and only for return visits.
 */

export type AnalyticsEvent =
  | "explore_viewed"
  | "venue_detail_viewed"
  | "directions_clicked"
  | "source_link_clicked"
  | "report_started"
  | "report_submitted"
  | "report_rejected"
  | "venue_share_attempted"
  | "share_sheet_opened"
  | "share_link_copied"
  | "share_dismissed"
  | "venue_saved"
  | "shortlist_created"
  | "shortlist_opened"
  | "shortlist_vote_cast"
  | "referred_visit"
  | "return_visit_browser"
  | "correction_submitted";

type Props = Record<string, string | number | boolean | undefined>;

interface PlausibleLike {
  (event: string, options?: { props?: Props }): void;
}

declare global {
  interface Window {
    plausible?: PlausibleLike;
  }
}

export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.plausible === "function") {
      window.plausible(event, { props });
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics]", event, props);
    }
  } catch {
    /* Analytics must never break a page. */
  }
}

/**
 * Where a visit came from, read from the link itself rather than from a
 * referrer header, so it survives the app switch out of a messaging app.
 *
 * `?via=share` is set by the venue share link and `?via=group` by a shortlist.
 * Attribution stops there: no click ids, no fingerprinting, nothing that
 * identifies who sent it.
 */
export function trackReferredVisit(): void {
  if (typeof window === "undefined") return;
  try {
    const via = new URLSearchParams(window.location.search).get("via");
    if (via === "share" || via === "group") {
      track("referred_visit", { via, path: window.location.pathname });
    }
  } catch {
    /* ignore */
  }
}

const LAST_SEEN_KEY = "findthecrowd:last-seen-night";

/**
 * A return visit on a different night. Nights, not sessions: coming back the
 * next weekend is the behaviour worth measuring, and reloading the page twice
 * on a Friday is not.
 */
export function trackReturnVisit(night: string): void {
  if (typeof window === "undefined") return;
  try {
    const previous = window.localStorage.getItem(LAST_SEEN_KEY);
    if (previous && previous !== night) {
      track("return_visit_browser", { previousNight: previous, night });
    }
    window.localStorage.setItem(LAST_SEEN_KEY, night);
  } catch {
    /* ignore */
  }
}

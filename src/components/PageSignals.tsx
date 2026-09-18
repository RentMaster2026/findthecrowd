"use client";

import { useEffect } from "react";
import { track, trackReferredVisit, trackReturnVisit, type AnalyticsEvent } from "@/lib/analytics";

/**
 * Fires the page-level analytics events once per mount.
 *
 * Kept as its own client component so the pages around it can stay server
 * components and keep rendering on the first byte.
 */
export function PageSignals({
  event,
  night,
  props = {},
}: {
  event: AnalyticsEvent;
  /** The Ottawa night being viewed, used for the return-visit signal. */
  night?: string;
  props?: Record<string, string | number | boolean | undefined>;
}) {
  useEffect(() => {
    track(event, props);
    trackReferredVisit();
    if (night) trackReturnVisit(night);
    // Intentionally once per mount. Re-firing on every prop change would turn
    // one visit into a dozen and make every funnel ratio meaningless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

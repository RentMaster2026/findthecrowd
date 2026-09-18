"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

/**
 * Share this place.
 *
 * Three things this gets right that a naive implementation does not:
 *
 * 1. It never claims a share happened. `navigator.share` resolving means the
 *    OS sheet closed, not that a link was sent, and on several platforms a
 *    cancellation resolves rather than rejecting. So the sheet opening is
 *    counted as an attempt and nothing else. Only the copy fallback, which we
 *    can actually observe completing, counts as a link leaving the device.
 *
 * 2. Any crowd claim in the share text carries an "as of" time. A message
 *    forwarded at 2am saying "82% say go" is a lie by then unless it says when
 *    it was true. If there is no current evidence, the text says nothing about
 *    the crowd at all rather than implying an empty room.
 *
 * 3. The link is canonical and works for a stranger with no account.
 */
export function ShareButton({
  url,
  title,
  subtitle,
  asOf,
  venueId,
  className = "btn btn-ghost",
  children = "Share",
}: {
  /** Canonical, absolute. `?via=share` is appended here, not by the caller. */
  url: string;
  title: string;
  /** One line of context. Must already be true without a timestamp, or pass asOf. */
  subtitle?: string;
  /** ISO instant the subtitle was true. Renders as "as of 11:42pm". */
  asOf?: string;
  venueId?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function flash(next: "copied" | "failed") {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2400);
  }

  function shareUrl(): string {
    try {
      const u = new URL(url);
      u.searchParams.set("via", "share");
      return u.toString();
    } catch {
      return url;
    }
  }

  function shareText(): string {
    if (!subtitle) return title;
    if (!asOf) return `${title}. ${subtitle}`;
    const time = new Date(asOf).toLocaleTimeString("en-CA", {
      timeZone: "America/Toronto",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${title}. ${subtitle} (as of ${time})`;
  }

  async function onShare() {
    const link = shareUrl();
    track("venue_share_attempted", { venueId });

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        track("share_sheet_opened", { venueId });
        await navigator.share({ title, text: shareText(), url: link });
        // Resolved. That is all we know: the sheet closed. Not counted as a
        // completed share, and deliberately not shown as success either.
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          track("share_dismissed", { venueId });
          return; // Cancelling is harmless and silent.
        }
        // Anything else: fall through to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      track("share_link_copied", { venueId });
      flash("copied");
    } catch {
      flash("failed");
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onShare}
      aria-live="polite"
      data-state={state}
    >
      {state === "copied" ? "Link copied" : state === "failed" ? "Copy failed" : children}
    </button>
  );
}

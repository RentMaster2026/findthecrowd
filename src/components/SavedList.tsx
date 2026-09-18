"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShareButton } from "./ShareButton";
import { useSaved } from "@/lib/saved";
import { track } from "@/lib/analytics";
import { DISTRICT_LABEL, KIND_LABEL } from "@/lib/labels";
import type { District, VenueKind } from "@/lib/types";

export interface SavedVenue {
  id: string;
  slug: string;
  name: string;
  district: District;
  kind: VenueKind;
}

/**
 * Saved places, and the one social step: turn two or three of them into a link
 * your friends can vote on.
 *
 * Bounded on purpose. There is no feed, no follow, no profile and no way to see
 * who voted. It is a shortlist and a tally, which is the actual thing a group
 * standing on a street corner needs.
 */
export function SavedList({
  venues,
  minVenues,
  maxVenues,
  ttlHours,
}: {
  venues: SavedVenue[];
  minVenues: number;
  maxVenues: number;
  ttlHours: number;
}) {
  const { ids, hydrated, remove, clear } = useSaved();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const byId = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);
  const saved = ids.map((id) => byId.get(id)).filter((v): v is SavedVenue => Boolean(v));

  if (!hydrated) {
    // Saved venues live in this browser, so the server cannot know them. A
    // placeholder here keeps the first paint stable instead of flashing an
    // empty state at someone who has five places saved.
    return <div className="empty">Loading your saved places…</div>;
  }

  if (saved.length === 0) {
    return (
      <div className="empty">
        <p>Nothing saved yet.</p>
        <p className="empty-sub">
          Tap the bookmark on any place to keep it here. Save two or more and you can send
          your friends a link to vote on.
        </p>
        <Link href="/" className="inline-link">
          Find somewhere
        </Link>
      </div>
    );
  }

  const canShare = saved.length >= minVenues;
  const tooMany = saved.length > maxVenues;

  async function createShortlist() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueIds: saved.slice(0, maxVenues).map((v) => v.id),
          title: title.trim() || null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Could not create that link.");
        setCreating(false);
        return;
      }
      setLink(payload.url as string);
      track("shortlist_created", { venues: saved.length });
    } catch {
      setError("No connection. Try again when you have signal.");
    }
    setCreating(false);
  }

  return (
    <>
      <div className="feed">
        {saved.map((venue) => (
          <article className="card saved-row" key={venue.id}>
            <div className="card-body">
              <h3 className="venue-name">
                <Link href={`/v/${venue.slug}`} className="stretched-link">
                  {venue.name}
                </Link>
              </h3>
              <div className="venue-meta">
                {KIND_LABEL[venue.kind]} · {DISTRICT_LABEL[venue.district]}
              </div>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => remove(venue.id)}
              aria-label={`Remove ${venue.name} from saved`}
            >
              <CloseIcon />
            </button>
          </article>
        ))}
      </div>

      <button type="button" className="link-button" onClick={clear}>
        Clear all saved
      </button>

      <div className="section-head">
        <h2>Pick with friends</h2>
      </div>

      {link ? (
        <div className="group-created">
          <p>
            Your shortlist is live. Anyone with this link can vote, no sign-up. It expires in{" "}
            {ttlHours} hours.
          </p>
          <code className="group-link">{link}</code>
          <div className="venue-actions-row">
            <ShareButton url={link} title={title.trim() || "Where should we go?"}>
              Send to the group
            </ShareButton>
            <a className="btn btn-ghost" href={link}>
              Open it
            </a>
          </div>
          <p className="source-line">
            Treat it like a link, not a password: anyone who gets it can open and vote. It is
            not listed anywhere and search engines are told not to index it.
          </p>
        </div>
      ) : (
        <>
          <p className="section-note">
            Turn {minVenues} to {maxVenues} of your saved places into a link. Friends open it
            and vote without registering, and everyone sees the running count.
          </p>

          <label className="field-inline">
            <span>Name it (optional)</span>
            <input
              type="text"
              className="search-input search-input-block"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Friday"
            />
          </label>

          {tooMany && (
            <p className="note">
              Only the first {maxVenues} saved places go on the shortlist. A ballot with ten
              options is not a decision.
            </p>
          )}

          {error && (
            <div className="note note-error" role="alert">
              {error}
            </div>
          )}

          <button
            className="btn"
            onClick={createShortlist}
            disabled={!canShare || creating}
          >
            {creating
              ? "Creating…"
              : canShare
                ? "Ask the group"
                : `Save ${minVenues - saved.length} more to share`}
          </button>
        </>
      )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

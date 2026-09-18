"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShareButton } from "./ShareButton";
import { getVoterId } from "@/lib/saved";
import { track } from "@/lib/analytics";
import { DISTRICT_LABEL, KIND_LABEL } from "@/lib/labels";
import type { District, ShortlistTally, VenueKind } from "@/lib/types";

export interface GroupVenue {
  id: string;
  slug: string;
  name: string;
  district: District;
  kind: VenueKind;
  address: string;
}

/**
 * The group ballot.
 *
 * Votes are "where people want to go". They are stored separately from crowd
 * reports, never enter the score, and the copy on this page says so, because
 * five friends voting for a bar is not five people standing in it.
 *
 * A vote can be changed. The server keys on (link, browser), so changing your
 * mind replaces your vote rather than adding one.
 */
export function GroupVote({
  initialTally,
  venues,
  url,
}: {
  initialTally: ShortlistTally;
  venues: GroupVenue[];
  url: string;
}) {
  const [tally, setTally] = useState(initialTally);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("shortlist_opened", { code: initialTally.shortlist.code });
  }, [initialTally.shortlist.code]);

  const byId = new Map(venues.map((v) => [v.id, v]));
  const sorted = [...tally.counts].sort((a, b) => b.votes - a.votes);
  const top = sorted[0];
  const hasWinner =
    tally.totalVotes > 0 && top && (sorted.length === 1 || top.votes > sorted[1].votes);
  const leader = hasWinner ? byId.get(top.venueId) : null;

  async function vote(venueId: string) {
    if (busy || tally.expired) return;
    setBusy(venueId);
    setError(null);
    try {
      const res = await fetch(`/api/shortlists/${tally.shortlist.code}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId: getVoterId(), venueId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Could not record that vote.");
        setBusy(null);
        return;
      }
      setTally(payload.tally as ShortlistTally);
      setMyVote(venueId);
      track("shortlist_vote_cast", { code: tally.shortlist.code });
    } catch {
      setError("No connection. Try again when you have signal.");
    }
    setBusy(null);
  }

  if (tally.expired) {
    return (
      <div className="empty">
        <p>This group link has expired.</p>
        <p className="empty-sub">
          Shortlists last one night on purpose, so an old plan never shows up looking like
          tonight&apos;s. Make a new one from your saved places.
        </p>
        <Link href="/saved" className="inline-link">
          Go to Saved
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="ballot">
        {tally.counts.map(({ venueId, votes }) => {
          const venue = byId.get(venueId);
          if (!venue) return null;
          const share = tally.totalVotes > 0 ? (votes / tally.totalVotes) * 100 : 0;
          const mine = myVote === venueId;

          return (
            <button
              key={venueId}
              type="button"
              className="ballot-option"
              onClick={() => vote(venueId)}
              disabled={busy !== null}
              aria-pressed={mine}
              data-mine={mine}
            >
              <span className="ballot-bar" style={{ width: `${share}%` }} aria-hidden="true" />
              <span className="ballot-body">
                <span className="ballot-name">{venue.name}</span>
                <span className="ballot-meta">
                  {KIND_LABEL[venue.kind]} · {DISTRICT_LABEL[venue.district]}
                </span>
              </span>
              <span className="ballot-count">
                {votes}
                <span className="sr-only"> {votes === 1 ? "vote" : "votes"}</span>
                {mine && <span className="ballot-mine">your pick</span>}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="note note-error" role="alert">
          {error}
        </div>
      )}

      <p className="source-line" role="status">
        {tally.totalVotes === 0
          ? "No votes yet. Tap one to start."
          : `${tally.totalVotes} ${tally.totalVotes === 1 ? "vote" : "votes"} so far. Tap a different one to change yours.`}
      </p>

      {leader && (
        <div className="group-leader">
          <h2>Leading: {leader.name}</h2>
          <p className="group-leader-meta">
            {KIND_LABEL[leader.kind]} · {DISTRICT_LABEL[leader.district]} · {leader.address}
          </p>
          <div className="venue-actions-row">
            <Link className="btn btn-ghost" href={`/v/${leader.slug}`}>
              See the place
            </Link>
            <a
              className="btn btn-ghost"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${leader.name}, ${leader.address}, Ottawa`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("directions_clicked", { venueId: leader.id, from: "group" })}
            >
              Directions
            </a>
          </div>
        </div>
      )}

      <div className="venue-actions-row" style={{ marginTop: 18 }}>
        <ShareButton url={url} title={tally.shortlist.title ?? "Where should we go?"}>
          Send to more people
        </ShareButton>
      </div>

      <p className="source-line">
        Votes are where people want to go. They are stored separately and never count as
        anyone being at a venue, so they cannot change a crowd score. Anyone with this link
        can open it and vote.
      </p>
    </>
  );
}

import Link from "next/link";
import { CrowdMeter, Score } from "./Score";
import {
  CROWD_LABEL,
  DISTRICT_LABEL,
  KIND_LABEL,
  TAG_LABEL,
  lineLabel,
  relativeTime,
} from "@/lib/labels";
import { formatClock } from "@/lib/clock";
import type { CrowdLevel, VenueWithScore } from "@/lib/types";

/**
 * A venue in the feed.
 *
 * Two visual states, deliberately far apart. A place that is live and going off
 * gets a solid colour strip across the top of the card saying what is happening
 * in there right now. Everything else is a flat dark card. Scanning the feed
 * should feel like walking down a street, not like reading a table.
 */
export function VenueCard({ row, flag = false }: { row: VenueWithScore; flag?: boolean }) {
  const { venue, score, nextEvent } = row;
  const live = score.freshness === "live";

  // Say the thing that is actually true. A rammed room and a quiet room people
  // love are both worth flagging, but they are not the same headline.
  const flagText =
    score.crowd !== null && score.crowd >= 4.3 ? "Packed right now" : "Going off right now";

  return (
    <Link href={`/v/${venue.slug}`} className="card" data-flagged={flag}>
      {flag && (
        <div className="card-flag">
          <span className="pulse-square" aria-hidden="true" />
          {flagText}
          <span className="card-flag-count">{score.sampleSize} reports</span>
        </div>
      )}

      <div className="card-row">
        <div className="card-body">
          <div className="venue-name">{venue.name}</div>
          <div className="venue-meta">
            {KIND_LABEL[venue.kind]} · {DISTRICT_LABEL[venue.district]}
          </div>

          <div className="card-facts">
            {live && !flag && (
              <span className="chip" data-tone="live">
                <span className="pulse" />
                Live
              </span>
            )}
            {score.crowd !== null && (
              <span className="chip">
                <CrowdMeter crowd={score.crowd} />
                {CROWD_LABEL[Math.round(score.crowd) as CrowdLevel]}
              </span>
            )}
            {score.line && score.line !== "none" && (
              <span className="chip">{lineLabel(score.line, venue.kind)}</span>
            )}
            {score.cover !== null && score.cover > 0 && (
              <span className="chip">${score.cover} cover</span>
            )}
            {score.topTags.slice(0, 1).map((tag) => (
              <span className="chip" key={tag}>
                {TAG_LABEL[tag]}
              </span>
            ))}
          </div>

          {nextEvent && (
            <div className="card-event">
              <span className="card-event-time">{formatClock(nextEvent.startsAt)}</span>
              {nextEvent.title}
            </div>
          )}

          <div className="source-line">
            {score.sampleSize === 0
              ? "No reports in the last 6 hours"
              : `${score.sampleSize} ${score.sampleSize === 1 ? "person" : "people"} reported, last ${relativeTime(score.minutesSinceLast)}`}
          </div>
        </div>

        <Score score={score} />
      </div>
    </Link>
  );
}

import Link from "next/link";
import { CrowdMeter, Score, evidenceSentence } from "./Score";
import { SaveButton } from "./SaveButton";
import { ShareButton } from "./ShareButton";
import {
  CROWD_LABEL,
  DISTRICT_LABEL,
  KIND_LABEL,
  TAG_LABEL,
  lineLabel,
  openLabelShort,
  priceLabel,
  relativeTime,
} from "@/lib/labels";
import { formatOttawaClock, nightTag } from "@/lib/time";
import { canonical } from "@/lib/seo";
import type { CrowdLevel, VenueWithScore } from "@/lib/types";
import type { PlainDate } from "@/lib/time";

/**
 * A venue in the feed.
 *
 * The card is an <article> with one stretched link over it rather than a big
 * <a>, because Save and Share are buttons and a button inside an anchor is
 * neither valid nor operable. The link still covers the card for a thumb; the
 * two action buttons sit above it.
 *
 * What is on the card is limited to things that help a decision, and every
 * changing fact carries its age. A chip with no timestamp is how a
 * three-hour-old queue reading ends up looking like the door right now.
 */
export function VenueCard({
  row,
  night,
  showEvent = true,
}: {
  row: VenueWithScore;
  night: PlainDate;
  showEvent?: boolean;
}) {
  const { venue, score, nextEvent, openState } = row;
  const href = `/v/${venue.slug}`;

  const shareSubtitle =
    score.score !== null && score.confident
      ? `${score.score}% of ${score.contributors} people said it's worth going`
      : undefined;

  return (
    <article className="card" data-quiet={score.score === null}>
      <div className="card-row">
        <div className="card-body">
          <h3 className="venue-name">
            <Link href={href} className="stretched-link">
              {venue.name}
            </Link>
          </h3>
          <div className="venue-meta">
            {KIND_LABEL[venue.kind]} · {DISTRICT_LABEL[venue.district]}
          </div>

          <div className="card-facts">
            <span className="chip" data-open={openState.kind}>
              {openLabelShort(openState)}
            </span>

            {score.crowd && (
              <span className="chip">
                <CrowdMeter level={score.crowd.value} />
                {CROWD_LABEL[Math.round(score.crowd.value) as CrowdLevel]}
                <span className="chip-age">{relativeTime(score.crowd.minutesSinceLast)}</span>
              </span>
            )}

            {score.queue && score.queue.value !== "none" && (
              <span className="chip">
                {lineLabel(score.queue.value, venue.kind)}
                <span className="chip-age">{relativeTime(score.queue.minutesSinceLast)}</span>
              </span>
            )}

            {score.cover && score.cover.value > 0 && (
              <span className="chip">
                ${score.cover.value} cover
                <span className="chip-age">{relativeTime(score.cover.minutesSinceLast)}</span>
              </span>
            )}

            {score.split && <span className="chip">People disagree</span>}

            {score.topTags.slice(0, 1).map((tag) => (
              <span className="chip" key={tag}>
                {TAG_LABEL[tag]}
              </span>
            ))}
          </div>

          {showEvent && nextEvent && (
            <div className="card-event">
              <span className="card-event-time">{formatOttawaClock(nextEvent.startsAt)}</span>
              <span className="card-event-day">{nightTag(nextEvent.nightOf, night)}</span>
              <span className="card-event-title">{nextEvent.title}</span>
              <span className="card-event-price">{priceLabel(nextEvent.price)}</span>
            </div>
          )}

          <p className="source-line">{evidenceSentence(score)}</p>
        </div>

        <Score score={score} />
      </div>

      <div className="card-actions">
        <SaveButton venueId={venue.id} venueName={venue.name} />
        <ShareButton
          className="icon-btn"
          url={canonical(href)}
          title={`${venue.name}, ${DISTRICT_LABEL[venue.district]}`}
          subtitle={shareSubtitle}
          asOf={score.lastReportAt ?? undefined}
          venueId={venue.id}
        >
          <ShareIcon />
        </ShareButton>
      </div>
    </article>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 15V3M8 7l4-4 4 4" />
    </svg>
  );
}

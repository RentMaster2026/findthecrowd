import Link from "next/link";
import { SourceLink } from "./SourceLink";
import { DISTRICT_LABEL, priceLabel } from "@/lib/labels";
import { describeNight, formatOttawaClock } from "@/lib/time";
import type { PlainDate } from "@/lib/time";
import type { Venue, VenueEvent } from "@/lib/types";

const CATEGORY_LABEL: Record<VenueEvent["category"], string> = {
  dj: "DJ",
  "live-band": "Live music",
  comedy: "Comedy",
  sports: "Sports",
  market: "Market",
  festival: "Festival",
  community: "Community",
};

/**
 * One event.
 *
 * The date is never optional. The bug this replaces put "10:30pm" on the
 * homepage for an event happening the following night, so every card here
 * prints the relative word and the actual calendar date together, and an event
 * that is not on the night being viewed is visibly marked.
 *
 * Price has three states, not two: a number, free, or not checked. "Not
 * checked" is printed as words. Filling it in with a plausible figure is the
 * same class of mistake as inventing a crowd score.
 */
export function EventCard({
  event,
  venue,
  night,
}: {
  event: VenueEvent;
  venue: Venue;
  night: PlainDate;
}) {
  const isTonight = event.nightOf === night;
  const cancelled = event.status === "cancelled";

  return (
    <article className="card event-card" data-cancelled={cancelled}>
      <div className="card-row">
        <div className="event-time" aria-hidden="true">
          {formatOttawaClock(event.startsAt)}
          <span>{CATEGORY_LABEL[event.category]}</span>
        </div>

        <div className="card-body">
          <h3 className="event-title">
            <Link href={`/v/${venue.slug}`} className="stretched-link">
              {event.title}
            </Link>
          </h3>

          <div className="event-when" data-future={!isTonight}>
            {describeNight(event.nightOf, night)} · {formatOttawaClock(event.startsAt)}
          </div>

          <div className="event-meta">
            {venue.name} · {DISTRICT_LABEL[venue.district]} · {CATEGORY_LABEL[event.category]}
          </div>

          <div className="event-price" data-unknown={event.price.kind === "unknown"}>
            {event.price.kind === "unknown"
              ? "Door price not checked with the venue"
              : priceLabel(event.price)}
          </div>

          {cancelled && (
            <p className="event-cancelled">
              Cancelled{event.note ? `. ${event.note}` : "."}
            </p>
          )}

          <SourceLink source={event.source} />
        </div>
      </div>
    </article>
  );
}

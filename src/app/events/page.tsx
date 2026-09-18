import Link from "next/link";
import { getWeekEvents } from "@/lib/store";
import { VENUE_BY_ID } from "@/data/venues";
import { TopBar } from "@/components/TopBar";
import { EventCard } from "@/components/EventCard";
import { SecondaryNav } from "@/components/Nav";
import { resolveNow } from "@/lib/demo";
import { formatNightShort, nightHeading, nightOf } from "@/lib/time";
import { pageMetadata } from "@/lib/seo";
import type { VenueEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Ottawa events this week",
  description:
    "Live music, DJ nights, comedy and sports in Ottawa over the next seven nights. Every listing links to the page it came from and the date we checked it.",
  path: "/events",
});

/**
 * The full week.
 *
 * Grouped by Ottawa NIGHT, not by calendar date, so a 12:30am set sits under
 * the night people would call it rather than starting a new heading for the
 * following morning. Each group prints the relative word and the real date
 * together, which is the specific failure this page had: three headings, two of
 * them for the same date, one of them wrong, and a trailing group of events
 * with no date at all.
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string }>;
}) {
  const { at } = await searchParams;
  const { now } = resolveNow(at);
  const events = await getWeekEvents(now, 7);
  const night = nightOf(now);

  const grouped = new Map<string, VenueEvent[]>();
  for (const event of events) {
    const list = grouped.get(event.nightOf);
    if (list) list.push(event);
    else grouped.set(event.nightOf, [event]);
  }

  return (
    <>
      <TopBar />
      <div className="page">
        <h1 className="page-title">What&apos;s on</h1>
        <p className="page-sub">
          The next seven nights in Ottawa. Only events with a source we have checked.
        </p>

        {events.length === 0 && (
          <div className="empty">
            <p>No checked events for the next seven nights.</p>
            <p className="empty-sub">
              This list is short because an event only appears once someone has verified it
              against the venue&apos;s own page or a ticket listing. An empty list here means
              our coverage is thin, not that Ottawa is quiet.
            </p>
            <Link href="/" className="inline-link">
              Back to Explore
            </Link>
          </div>
        )}

        {[...grouped.entries()].map(([groupNight, list]) => (
          <section key={groupNight}>
            <div className="section-head">
              <h2>
                {nightHeading(groupNight, night)}
                <span className="section-date"> · {formatNightShort(groupNight)}</span>
              </h2>
              <span className="section-count">{list.length}</span>
            </div>

            <div className="feed">
              {list.map((event) => {
                const venue = VENUE_BY_ID.get(event.venueId);
                if (!venue) return null;
                return (
                  <EventCard key={event.id} event={event} venue={venue} night={night} />
                );
              })}
            </div>
          </section>
        ))}

        <p className="source-line" style={{ marginTop: 20 }}>
          Every card names the page its listing came from and the date a person last checked
          it. If something here is wrong,{" "}
          <Link href="/corrections?type=event" className="inline-link">
            tell us
          </Link>{" "}
          and we will fix it.
        </p>

        <SecondaryNav />
      </div>
    </>
  );
}

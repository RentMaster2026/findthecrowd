import Link from "next/link";
import { getEvents } from "@/lib/store";
import { TopBar } from "@/components/TopBar";
import { Score } from "@/components/Score";
import { DISTRICT_LABEL } from "@/lib/labels";
import { formatClock, dayHeading } from "@/lib/clock";

import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Ottawa events this week",
  description:
    "Live music, DJ nights, comedy and sports in Ottawa over the next seven days, with a live crowd score on every venue.",
  path: "/events",
});

const CATEGORY_LABEL: Record<string, string> = {
  dj: "DJ",
  "live-band": "Live",
  comedy: "Comedy",
  sports: "Sports",
  market: "Market",
  festival: "Festival",
  community: "Community",
};

export default async function EventsPage() {
  const rows = await getEvents();

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = dayHeading(row.event.startsAt);
    const list = grouped.get(key);
    if (list) list.push(row);
    else grouped.set(key, [row]);
  }

  return (
    <>
      <TopBar />
      <div className="page">
        <h1 className="page-title">What&apos;s on</h1>
        <p className="page-sub">
          Ottawa events for the next seven days, with each venue&apos;s live crowd score beside it.
        </p>

        {rows.length === 0 && <div className="empty">Nothing listed for the next week.</div>}

        {[...grouped.entries()].map(([day, list]) => (
          <section key={day}>
            <div className="section-head">
              <h2>{day}</h2>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{list.length}</span>
            </div>

            {list.map(({ event, venue, score }) => (
              <Link href={`/v/${venue.slug}`} className="card" key={event.id}>
                <div className="card-row" style={{ alignItems: "center" }}>
                  <div className="event-time">
{formatClock(event.startsAt)}
                    <span>{CATEGORY_LABEL[event.category] ?? event.category}</span>
                  </div>
                  <div className="card-body">
                    <div className="event-title">{event.title}</div>
                    <div className="event-meta">
                      {venue.name} · {DISTRICT_LABEL[venue.district]}
                    </div>
                    <div className="source-line">
                      {event.price === null ? "Free" : `$${event.price}`} · via {event.source}
                    </div>
                  </div>
                  {/* An event card is about the event. The venue's live score
                      earns a place here only when there is one; a column of
                      empty placeholders is noise. */}
                  {score.score !== null && <Score score={score} />}
                </div>
              </Link>
            ))}
          </section>
        ))}

        <p className="source-line" style={{ marginTop: 20 }}>
          Listings are compiled from venue pages and public calendars, and each card names its
          source. Organisers can claim a venue to manage its own listings.
        </p>
      </div>
    </>
  );
}

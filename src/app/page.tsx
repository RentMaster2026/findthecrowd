import { Suspense } from "react";
import Link from "next/link";
import { getExplore, getTonightEvents, demoDataEnabled, isLiveBackend } from "@/lib/store";
import { VENUE_BY_ID, VENUE_BY_SLUG } from "@/data/venues";
import { editorialPicks } from "@/data/editorial";
import { VenueCard } from "@/components/VenueCard";
import { EventCard } from "@/components/EventCard";
import { TopBar } from "@/components/TopBar";
import { ExploreControls } from "@/components/ExploreControls";
import { PageSignals } from "@/components/PageSignals";
import { SecondaryNav } from "@/components/Nav";
import { JsonLd } from "@/components/JsonLd";
import { DISTRICT_LABEL } from "@/lib/labels";
import { resolveNow, simulatedLabel } from "@/lib/demo";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatNightLong, nightOf } from "@/lib/time";
import type { District } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Where should we go? Ottawa tonight",
  description:
    "Fresh crowd updates from people already out in Ottawa, plus tonight's verified events. See what is worth going to, save a few options and send them to your friends.",
  path: "/",
});

const INITIAL_ROWS = 12;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    district?: string;
    kind?: string;
    q?: string;
    view?: string;
    at?: string;
    show?: string;
  }>;
}) {
  const { district, kind, q, view, at, show } = await searchParams;
  const { now, simulated } = resolveNow(at);
  const tonight = view === "tonight";

  const explore = await getExplore(
    now,
    { district, kind, q },
    (d) => DISTRICT_LABEL[d as District] ?? d
  );
  const events = await getTonightEvents(now);
  const night = nightOf(now);

  const showAll = show === "all";
  const reported = explore.reported;
  const quiet = showAll ? explore.quiet : explore.quiet.slice(0, INITIAL_ROWS);
  const remaining = explore.quiet.length - quiet.length;

  const filterQs = new URLSearchParams();
  if (district) filterQs.set("district", district);
  if (kind) filterQs.set("kind", kind);
  if (q) filterQs.set("q", q);
  if (view) filterQs.set("view", view);
  filterQs.set("show", "all");

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Find the Crowd", path: "/" }])} />
      <PageSignals event="explore_viewed" night={night} props={{ view: tonight ? "tonight" : "now" }} />
      <TopBar contributorsThisHour={explore.contributorsThisHour} />

      <div className="page page-tight">
        <h1 className="page-title">Where should we go?</h1>
        <p className="page-sub">
          Fresh updates from people already out, and tonight&apos;s checked events.{" "}
          {formatNightLong(night)} in Ottawa.
        </p>
      </div>

      <Suspense fallback={<div className="controls" />}>
        <ExploreControls resultCount={tonight ? events.length : explore.rows.length} />
      </Suspense>

      <div className="page page-top-flush">
        {demoDataEnabled() && (
          <div className="note note-demo">
            <strong>Demo data.</strong> No database is connected, so crowd reports on this
            screen are generated and event listings include unverified samples. Nothing here
            is a real report.{" "}
            {simulated ? (
              <>
                Clock wound forward to {simulatedLabel(now)}{". "}
                <Link href="/" className="inline-link">
                  Back to real time
                </Link>
                .
              </>
            ) : (
              <Link href="/?at=peak" className="inline-link">
                See it at Saturday 11pm
              </Link>
            )}
          </div>
        )}

        {tonight ? (
          <TonightView events={events} night={night} />
        ) : (
          <>
            {reported.length > 0 && (
              <>
                <div className="section-head">
                  <h2>Reported in the last few hours</h2>
                  <span className="section-count">{reported.length}</span>
                </div>
                <div className="feed">
                  {reported.map((row) => (
                    <VenueCard key={row.venue.id} row={row} night={night} />
                  ))}
                </div>
              </>
            )}

            {reported.length === 0 && (
              <NoSignalYet events={events} night={night} venueCount={explore.rows.length} />
            )}

            {quiet.length > 0 && (
              <>
                <div className="section-head">
                  <h2>Everywhere else</h2>
                  <span className="section-count">{explore.quiet.length}</span>
                </div>
                <p className="section-note">
                  No reports in the last six hours. That is a gap in coverage, not a verdict on
                  the room.
                </p>
                <div className="feed">
                  {quiet.map((row) => (
                    <VenueCard key={row.venue.id} row={row} night={night} />
                  ))}
                </div>
                {remaining > 0 && (
                  <Link href={`/?${filterQs}`} className="btn btn-ghost" scroll={false}>
                    Show {remaining} more
                  </Link>
                )}
              </>
            )}

            {explore.rows.length === 0 && (
              <div className="empty">
                <p>Nothing matches that filter.</p>
                <Link href="/" className="inline-link">
                  Clear filters
                </Link>
              </div>
            )}
          </>
        )}

        {!isLiveBackend() && !demoDataEnabled() && (
          <p className="source-line" style={{ marginTop: 20 }}>
            No database is connected, so no reports can be shown or saved on this deployment.
          </p>
        )}

        <SecondaryNav />
      </div>
    </>
  );
}

/* ------------------------------------------------------------- tonight --- */

function TonightView({
  events,
  night,
}: {
  events: Awaited<ReturnType<typeof getTonightEvents>>;
  night: string;
}) {
  if (events.length === 0) {
    return (
      <div className="empty">
        <p>No checked events for {formatNightLong(night)} yet.</p>
        <p className="empty-sub">
          Only events with a source we have actually looked at appear here, so this list is
          short while Ottawa coverage is being built. It is not a claim that nothing is on.
        </p>
        <Link href="/" className="inline-link">
          See what people are reporting instead
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="section-head">
        <h2>Tonight&apos;s checked events</h2>
        <span className="section-count">{events.length}</span>
      </div>
      <div className="feed">
        {events.map((event) => {
          const venue = VENUE_BY_ID.get(event.venueId);
          if (!venue) return null;
          return <EventCard key={event.id} event={event} venue={venue} night={night} />;
        })}
      </div>
      <p className="source-line">
        Every event here links to the page it came from and the date we checked it. Events we
        could not verify are not listed.
      </p>
    </>
  );
}

/* ----------------------------------------------------------- empty state -- */

/**
 * The empty state is a product screen, not a fallback.
 *
 * When nothing has been reported, the page still has to answer "where should we
 * go". It does that with things that are true without any reports: events with
 * a checked source, a short editorial list that says why, and a direct
 * invitation to be the first person to report. What it must never do is fill
 * the screen with unknown-score tiles, which is what the audited version did
 * with all 41 venues.
 */
function NoSignalYet({
  events,
  night,
  venueCount,
}: {
  events: Awaited<ReturnType<typeof getTonightEvents>>;
  night: string;
  venueCount: number;
}) {
  const picks = editorialPicks(3);

  return (
    <section className="empty-state">
      <h2>Nobody has reported yet tonight</h2>
      <p>
        No usable crowd updates in the last six hours across {venueCount}{" "}
        {venueCount === 1 ? "place" : "places"}. Here is what we can tell you without them.
      </p>

      {events.length > 0 && (
        <>
          <h3>Checked events for {formatNightLong(night)}</h3>
          <div className="feed">
            {events.slice(0, 3).map((event) => {
              const venue = VENUE_BY_ID.get(event.venueId);
              if (!venue) return null;
              return <EventCard key={event.id} event={event} venue={venue} night={night} />;
            })}
          </div>
        </>
      )}

      {picks.length > 0 && (
        <>
          <h3>
            Editorial picks <span className="badge">Our opinion, not tonight&apos;s data</span>
          </h3>
          <ul className="pick-list">
            {picks.map((pick) => {
              const venue = VENUE_BY_SLUG.get(pick.venueSlug);
              if (!venue) return null;
              return (
                <li key={pick.venueSlug}>
                  <Link href={`/v/${venue.slug}`} className="pick-name">
                    {venue.name}
                  </Link>
                  <span className="pick-meta">{DISTRICT_LABEL[venue.district]}</span>
                  <p className="pick-note">{pick.note}</p>
                </li>
              );
            })}
          </ul>
          <p className="source-line">
            From our guide,{" "}
            <Link href={`/guides/${picks[0].guideSlug}`} className="inline-link">
              {picks[0].guideTitle}
            </Link>
            . Written by us, unaffected by reports, and not paid for.
          </p>
        </>
      )}

      <div className="empty-cta">
        <p>Out somewhere right now? Two questions and everyone else knows what it is like.</p>
        <Link href="/report" className="btn">
          Add the first update
        </Link>
      </div>
    </section>
  );
}

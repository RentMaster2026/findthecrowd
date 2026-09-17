import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenueDetail } from "@/lib/store";
import { Score, CrowdMeter } from "@/components/Score";
import { TopBar } from "@/components/TopBar";
import { ReportButton } from "@/components/ReportButton";
import {
  CROWD_LABEL,
  DISTRICT_LABEL,
  FRESHNESS_LABEL,
  KIND_LABEL,
  TAG_LABEL,
  formatCover,
  lineLabel,
  lineQuestion,
  relativeTime,
  venueClass,
} from "@/lib/labels";
import { MIN_CONFIDENT_REPORTS, WINDOW_MIN } from "@/lib/score";
import { resolveNow } from "@/lib/demo";
import { formatClock, dayLabel } from "@/lib/clock";
import { JsonLd } from "@/components/JsonLd";
import {
  breadcrumbJsonLd,
  pageMetadata,
  venueJsonLd,
  venueKindPhrase,
} from "@/lib/seo";
import { VENUES, VENUE_BY_SLUG } from "@/data/venues";
import type { CrowdLevel } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Every venue is a page Google can index on its own. */
export function generateStaticParams() {
  return VENUES.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = VENUE_BY_SLUG.get(slug);
  if (!venue) return {};
  return pageMetadata({
    title: `${venue.name}, ${venueKindPhrase(venue)}`,
    description: `How busy is ${venue.name} right now? Live crowd reports, wait times and what is on, from people already there. ${venue.address}, Ottawa.`,
    path: `/v/${venue.slug}`,
  });
}

export default async function VenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ at?: string }>;
}) {
  const { slug } = await params;
  const { at } = await searchParams;
  const { now } = resolveNow(at);
  const detail = await getVenueDetail(slug, now);
  if (!detail) notFound();

  const { venue, score, reports, events } = detail;
  const food = venueClass(venue.kind) === "food";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venue.name}, ${venue.address}, Ottawa`
  )}`;

  return (
    <>
      <JsonLd data={venueJsonLd(venue, score)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Find the Crowd", path: "/" },
          { name: venue.name, path: `/v/${venue.slug}` },
        ])}
      />
      <TopBar />

      <div className="page">
        <Link href="/" className="back-link">
          Back to tonight
        </Link>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", margin: "14px 0 18px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 24 }}>{venue.name}</h1>
            <p className="page-sub" style={{ margin: "6px 0 0" }}>
              {KIND_LABEL[venue.kind]} · {DISTRICT_LABEL[venue.district]} · {venue.agePolicy}
            </p>
            <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--text-mid)" }}>{venue.blurb}</p>
          </div>
          <Score score={score} size="lg" />
        </div>

        <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 16px" }}>
          {score.score === null
            ? `No reports in the last ${WINDOW_MIN / 60} hours.`
            : `${score.score}% of ${score.sampleSize} ${score.sampleSize === 1 ? "person" : "people"} in the last ${WINDOW_MIN / 60} hours said it's worth coming. ${FRESHNESS_LABEL[score.freshness]}, last report ${relativeTime(score.minutesSinceLast)}.`}
          {score.score !== null && !score.confident && (
            <>
              {" "}
              <span style={{ color: "var(--text-mid)" }}>
                Under {MIN_CONFIDENT_REPORTS} reports, so treat it as a hint, not a fact.
              </span>
            </>
          )}
        </p>

        <dl className="stat-grid">
          <div className="stat">
            <dt>Crowd</dt>
            <dd style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CrowdMeter crowd={score.crowd} />
              <span>{score.crowd === null ? "No data" : CROWD_LABEL[Math.round(score.crowd) as CrowdLevel]}</span>
            </dd>
          </div>
          <div className="stat">
            <dt>{lineQuestion(venue.kind)}</dt>
            <dd>{score.line === null ? "No data" : lineLabel(score.line, venue.kind)}</dd>
          </div>
          <div className="stat">
            <dt>{food ? "Age policy" : "Cover"}</dt>
            <dd>
              {food
                ? "All ages"
                : score.cover === null
                  ? formatCover(venue.typicalCover)
                  : formatCover(score.cover)}
            </dd>
          </div>
        </dl>

        {score.topTags.length > 0 && (
          <div className="card-facts" style={{ marginTop: 12 }}>
            {score.topTags.map((tag) => (
              <span className="chip" key={tag}>
                {TAG_LABEL[tag]}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <ReportButton venueId={venue.id} venueName={venue.name} venueKind={venue.kind} />
        </div>

        <div style={{ marginTop: 10 }}>
          <a className="btn btn-ghost" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            {venue.address} · Directions
          </a>
        </div>

        {events.length > 0 && (
          <>
            <div className="section-head">
              <h2>What&apos;s on</h2>
            </div>
            {events.slice(0, 6).map((e) => (
              <div className="event-row" key={e.id}>
                <div className="event-time">
                  {formatClock(e.startsAt)}
                  <span>{dayLabel(e.startsAt, now)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="event-title">{e.title}</div>
                  <div className="event-meta">
                    {e.price === null ? "Free" : `$${e.price}`} · via {e.source}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="section-head">
          <h2>Recent reports</h2>
        </div>

        {reports.length === 0 ? (
          <div className="empty">
            Nobody has reported here recently. If you&apos;re inside, you&apos;re the first.
          </div>
        ) : (
          <div>
            {reports.slice(0, 12).map((r) => {
              const mins = (now.getTime() - new Date(r.createdAt).getTime()) / 60000;
              return (
                <div className="report-row" key={r.id}>
                  <div className="report-when">{relativeTime(mins)}</div>
                  <div style={{ flex: 1 }}>
                    <span className="report-verdict" data-yes={r.worthIt}>
                      {r.worthIt ? "Worth coming" : "Not right now"}
                    </span>
                    <span style={{ color: "var(--text-dim)" }}>
                      {" · "}
                      {CROWD_LABEL[r.crowd]}
                      {r.line !== "none" && ` · ${lineLabel(r.line, venue.kind)}`}
                      {r.cover !== null && r.cover > 0 && ` · $${r.cover}`}
                    </span>
                    {r.tags.length > 0 && (
                      <div style={{ color: "var(--text-dim)", marginTop: 2 }}>
                        {r.tags.map((t) => TAG_LABEL[t]).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="source-line" style={{ marginTop: 18 }}>
          Reports are anonymous and expire from the score after {WINDOW_MIN / 60} hours. Venue
          details are compiled from public listings. <Link href="/about" style={{ textDecoration: "underline" }}>Tell us if something is wrong</Link>.
        </p>
      </div>
    </>
  );
}

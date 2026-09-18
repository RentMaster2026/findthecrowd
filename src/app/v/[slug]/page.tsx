import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenueDetail } from "@/lib/store";
import { CrowdMeter, Score, evidenceSentence } from "@/components/Score";
import { TopBar } from "@/components/TopBar";
import { ReportButton } from "@/components/ReportButton";
import { SaveButton } from "@/components/SaveButton";
import { ShareButton } from "@/components/ShareButton";
import { SourceLink } from "@/components/SourceLink";
import { DirectionsLink } from "@/components/DirectionsLink";
import { PageSignals } from "@/components/PageSignals";
import { SecondaryNav } from "@/components/Nav";
import {
  CROWD_LABEL,
  DISTRICT_LABEL,
  KIND_LABEL,
  TAG_LABEL,
  formatCover,
  lineLabel,
  lineQuestion,
  openLabel,
  priceLabel,
  relativeTime,
} from "@/lib/labels";
import {
  CROWD_FRESH_MIN,
  MIN_CONFIDENT_CONTRIBUTORS,
  QUEUE_FRESH_MIN,
  WINDOW_MIN,
} from "@/lib/score";
import { resolveNow } from "@/lib/demo";
import { describeNight, formatOttawaClock } from "@/lib/time";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, canonical, pageMetadata, venueJsonLd, venueKindPhrase } from "@/lib/seo";
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

  /**
   * The link preview is venue-specific and deliberately carries no crowd claim.
   *
   * A preview is cached by every messaging app that renders it, sometimes for
   * days. "82% say go" baked into that card would still be showing on Sunday
   * afternoon. So the preview describes the PLACE, which is durable, and the
   * live numbers live on the page, where they are timestamped.
   */
  return pageMetadata({
    title: `${venue.name}, ${venueKindPhrase(venue)}`,
    description: `${venue.blurb} See tonight's crowd updates from people already inside, what is on, and directions. ${venue.address}, Ottawa.`,
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

  const { venue, score, reports, labelledReports, events, openState, night } = detail;
  const food = venue.kind === "restaurant";
  const venueEvents = events.filter((e) => e.venueId === venue.id);

  const shareSubtitle =
    score.score !== null && score.confident
      ? `${score.score}% of ${score.contributors} people said it's worth going`
      : undefined;

  return (
    <>
      <JsonLd data={venueJsonLd(venue, score)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Find the Crowd", path: "/" },
          { name: venue.name, path: `/v/${venue.slug}` },
        ])}
      />
      <PageSignals event="venue_detail_viewed" night={night} props={{ venueId: venue.id }} />
      <TopBar />

      <div className="page">
        <Link href="/" className="back-link">
          Back to Explore
        </Link>

        <div className="venue-head">
          <div className="venue-head-text">
            <h1>{venue.name}</h1>
            <p className="page-sub">
              {KIND_LABEL[venue.kind]} · {DISTRICT_LABEL[venue.district]} · {venue.agePolicy}
            </p>
            <p className="venue-blurb">{venue.blurb}</p>
            <p className="venue-open" data-state={openState.kind}>
              {openLabel(openState)}
              {openState.kind === "unconfirmed" && (
                <span className="venue-open-note">
                  {" "}
                  We have not checked this venue&apos;s hours, so we will not tell you it is
                  open.
                </span>
              )}
            </p>
          </div>
          <Score score={score} size="lg" />
        </div>

        <p className="evidence-line">{evidenceSentence(score)}</p>

        <dl className="stat-grid">
          <div className="stat">
            <dt>Crowd</dt>
            <dd>
              {score.crowd ? (
                <>
                  <CrowdMeter level={score.crowd.value} />
                  <span>{CROWD_LABEL[Math.round(score.crowd.value) as CrowdLevel]}</span>
                  <span className="stat-age">
                    {relativeTime(score.crowd.minutesSinceLast)} ·{" "}
                    {score.crowd.contributors}{" "}
                    {score.crowd.contributors === 1 ? "person" : "people"}
                  </span>
                </>
              ) : (
                <span className="stat-unknown">
                  No reading in the last {CROWD_FRESH_MIN} min
                </span>
              )}
            </dd>
          </div>

          <div className="stat">
            <dt>{lineQuestion(venue.kind)}</dt>
            <dd>
              {score.queue ? (
                <>
                  <span>{lineLabel(score.queue.value, venue.kind)}</span>
                  <span className="stat-age">
                    {relativeTime(score.queue.minutesSinceLast)}
                  </span>
                </>
              ) : (
                <span className="stat-unknown">
                  No reading in the last {QUEUE_FRESH_MIN} min
                </span>
              )}
            </dd>
          </div>

          <div className="stat">
            <dt>{food ? "Age policy" : "Cover"}</dt>
            <dd>
              {food ? (
                <span>All ages</span>
              ) : score.cover ? (
                <>
                  <span>{formatCover(score.cover.value)}</span>
                  <span className="stat-age">reported {relativeTime(score.cover.minutesSinceLast)}</span>
                </>
              ) : (
                <>
                  <span>{formatCover(venue.typicalCover)}</span>
                  <span className="stat-age">typical, not reported tonight</span>
                </>
              )}
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

        <div className="venue-actions">
          <ReportButton
            venueId={venue.id}
            venueSlug={venue.slug}
            venueName={venue.name}
            venueKind={venue.kind}
          />
          <div className="venue-actions-row">
            <SaveButton venueId={venue.id} venueName={venue.name} variant="full" />
            <ShareButton
              url={canonical(`/v/${venue.slug}`)}
              title={`${venue.name}, ${DISTRICT_LABEL[venue.district]}`}
              subtitle={shareSubtitle}
              asOf={score.lastReportAt ?? undefined}
              venueId={venue.id}
            >
              Share
            </ShareButton>
          </div>
          <DirectionsLink venue={venue} />
        </div>

        {venueEvents.length > 0 && (
          <>
            <div className="section-head">
              <h2>What&apos;s on</h2>
            </div>
            {venueEvents.slice(0, 6).map((e) => (
              <div className="event-row" key={e.id} data-cancelled={e.status === "cancelled"}>
                <div className="event-time" aria-hidden="true">
                  {formatOttawaClock(e.startsAt)}
                </div>
                <div className="event-row-body">
                  <div className="event-title">{e.title}</div>
                  <div className="event-when" data-future={e.nightOf !== night}>
                    {describeNight(e.nightOf, night)} · {formatOttawaClock(e.startsAt)}
                  </div>
                  <div className="event-price" data-unknown={e.price.kind === "unknown"}>
                    {e.price.kind === "unknown"
                      ? "Door price not checked with the venue"
                      : priceLabel(e.price)}
                  </div>
                  {e.status === "cancelled" && (
                    <p className="event-cancelled">Cancelled{e.note ? `. ${e.note}` : "."}</p>
                  )}
                  <SourceLink source={e.source} />
                </div>
              </div>
            ))}
          </>
        )}

        <div className="section-head">
          <h2>Recent updates</h2>
        </div>

        {reports.length === 0 ? (
          <div className="empty">
            <p>Nobody has reported here recently.</p>
            <p className="empty-sub">
              That means we do not know what it is like, not that it is empty. If you are
              inside, you are the first.
            </p>
          </div>
        ) : (
          <div>
            {reports.slice(0, 12).map((r) => {
              const mins = (now.getTime() - new Date(r.createdAt).getTime()) / 60000;
              return (
                <div className="report-row" key={r.id}>
                  <div className="report-when">{relativeTime(mins)}</div>
                  <div className="report-body">
                    <span className="report-verdict" data-yes={r.worthIt}>
                      {r.worthIt ? "Worth coming" : "Not right now"}
                    </span>
                    <span className="report-detail">
                      {" · "}
                      {CROWD_LABEL[r.crowd]}
                      {r.line !== "none" && ` · ${lineLabel(r.line, venue.kind)}`}
                      {r.cover !== null && r.cover > 0 && ` · $${r.cover}`}
                    </span>
                    {r.tags.length > 0 && (
                      <div className="report-tags">
                        {r.tags.map((t) => TAG_LABEL[t]).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {labelledReports.length > 0 && (
          <>
            <div className="section-head">
              <h2>Updates from the venue or our team</h2>
            </div>
            <p className="section-note">
              These are shown because they are useful, and kept out of the percentage above
              because they are not independent.
            </p>
            {labelledReports.map((r) => (
              <div className="report-row" key={r.id}>
                <div className="report-when">
                  {relativeTime((now.getTime() - new Date(r.createdAt).getTime()) / 60000)}
                </div>
                <div className="report-body">
                  <span className="chip" data-tone="labelled">
                    {r.role === "venue" ? "From the venue" : "Find the Crowd team"}
                  </span>{" "}
                  <span className="report-detail">
                    {CROWD_LABEL[r.crowd]}
                    {r.line !== "none" && ` · ${lineLabel(r.line, venue.kind)}`}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        <p className="source-line" style={{ marginTop: 18 }}>
          Updates are anonymous. They stop counting toward the number after{" "}
          {WINDOW_MIN / 60} hours, and a number below {MIN_CONFIDENT_CONTRIBUTORS} people is
          marked low signal. Venue details are compiled from public listings.{" "}
          <Link href={`/corrections?type=venue&id=${venue.slug}`} className="inline-link">
            Something wrong? Tell us
          </Link>
          .
        </p>

        <SecondaryNav />
      </div>
    </>
  );
}

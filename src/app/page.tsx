import { Suspense } from "react";
import Link from "next/link";
import { getTonight, isLiveBackend } from "@/lib/store";
import { VenueCard } from "@/components/VenueCard";
import { TopBar } from "@/components/TopBar";
import { DistrictFilter } from "@/components/DistrictFilter";
import { DISTRICT_LABEL } from "@/lib/labels";
import { resolveNow, simulatedLabel } from "@/lib/demo";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import type { District, VenueWithScore } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "What is good in Ottawa tonight",
  description:
    "Live crowd reports from people already out in Ottawa. See which bars and clubs are busy right now, how long the line is, and whether it is worth the walk.",
  path: "/",
});

const DISTRICTS: District[] = [
  "byward",
  "elgin",
  "centretown",
  "lansdowne",
  "hintonburg",
  "little-italy",
];

function greeting(now: Date): { title: string; sub: string } {
  const h = now.getHours();
  const day = now.toLocaleDateString("en-CA", { weekday: "long" });
  if (h >= 22 || h < 4) return { title: "Out right now", sub: `${day} night · ranked by people already there` };
  if (h >= 17) return { title: "Tonight", sub: `${day} · ranked by people already there` };
  if (h >= 12) return { title: "Later today", sub: `${day} · reports pick up after 8pm` };
  return { title: "Today", sub: `${day} · reports pick up after 8pm` };
}

export default async function TonightPage({
  searchParams,
}: {
  searchParams: Promise<{ district?: string; at?: string }>;
}) {
  const { district, at } = await searchParams;
  const { now, simulated } = resolveNow(at);
  const all = await getTonight(now);

  const filtered = district ? all.filter((r) => r.venue.district === district) : all;

  const hot = filtered.filter((r) => r.score.score !== null && r.score.freshness !== "cold");

  /**
   * The solid red flag is the loudest thing in the app, so it has to stay rare.
   * A venue earns it by being live, confidently scored above 85, and busy, and
   * at most three can hold it at once. If everything is flagged, nothing is.
   */
  const flagged = new Set(
    hot
      .filter(
        (r) =>
          r.score.freshness === "live" &&
          r.score.confident &&
          (r.score.score ?? 0) >= 85 &&
          (r.score.crowd ?? 0) >= 3.5
      )
      .slice(0, 3)
      .map((r) => r.venue.id)
  );
  const quiet = filtered.filter((r) => r.score.score === null || r.score.freshness === "cold");

  const liveReports = all.reduce(
    (sum, r) => sum + (r.score.minutesSinceLast !== null && r.score.minutesSinceLast <= 60 ? r.score.sampleSize : 0),
    0
  );

  const { title, sub } = greeting(now);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Find the Crowd", path: "/" }])} />
      <TopBar liveReports={liveReports} />

      <div className="page" style={{ paddingBottom: 0 }}>
        <h1 className="page-title">{title}</h1>
        <p className="page-sub">
          {district ? `${DISTRICT_LABEL[district as District]} · ` : ""}
          {sub}
        </p>
      </div>

      <Suspense fallback={<div className="filters" />}>
        <DistrictFilter districts={DISTRICTS} />
      </Suspense>

      <div className="page" style={{ paddingTop: 0 }}>
        {!isLiveBackend() && (
          <div className="note">
            Demo data.{" "}
            {simulated ? (
              <>
                Clock wound forward to {simulatedLabel(now)} so you can see a full weekend.{" "}
                <Link href="/" style={{ textDecoration: "underline" }}>
                  Back to real time
                </Link>
                .
              </>
            ) : (
              <>
                No database is connected yet, so these reports are simulated for the current
                hour. That is why a weekday afternoon looks quiet.{" "}
                <Link href="/?at=peak" style={{ textDecoration: "underline" }}>
                  See it at Saturday 11pm
                </Link>
                .
              </>
            )}
          </div>
        )}

        {hot.length === 0 && quiet.length === 0 && (
          <div className="empty">Nothing in this district yet.</div>
        )}

        <div className="feed">
          {hot.map((row: VenueWithScore) => (
            <VenueCard key={row.venue.id} row={row} flag={flagged.has(row.venue.id)} />
          ))}
        </div>

        {quiet.length > 0 && (
          <>
            <div className="section-head">
              <h2>No signal yet</h2>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {quiet.length} {quiet.length === 1 ? "venue" : "venues"}
              </span>
            </div>
            <div className="note">
              These have no reports in the last six hours. If you&apos;re at one, you&apos;re the
              first. Two taps puts it on the map for everyone else.
            </div>
            <div className="feed">
              {quiet.map((row) => (
                <VenueCard key={row.venue.id} row={row} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

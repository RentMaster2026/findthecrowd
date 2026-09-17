import { getTonight } from "@/lib/store";
import { TopBar } from "@/components/TopBar";
import { VenuePicker } from "@/components/VenuePicker";

import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Report what a place is like right now",
  description:
    "Two taps and the rest of Ottawa knows what it is like in there. No account needed.",
  path: "/report",
});

/**
 * The report tab. Its only job is answering "which venue are you at?" in as few
 * taps as possible, so it leads with the places already busy right now — where
 * the person standing in a room is statistically most likely to be.
 */
export default async function ReportPage() {
  const rows = await getTonight();

  const venues = rows.map((r) => ({
    id: r.venue.id,
    slug: r.venue.slug,
    name: r.venue.name,
    district: r.venue.district,
    kind: r.venue.kind,
    live: r.score.freshness === "live",
  }));

  return (
    <>
      <TopBar />
      <div className="page">
        <h1 className="page-title">Report the vibe</h1>
        <p className="page-sub">
          Where are you? Two taps and the rest of Ottawa knows what it&apos;s like in there.
        </p>
        <VenuePicker venues={venues} />
      </div>
    </>
  );
}

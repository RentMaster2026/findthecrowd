import { getExplore } from "@/lib/store";
import { hasRankingEvidence } from "@/lib/score";
import { TopBar } from "@/components/TopBar";
import { VenuePicker, type PickerVenue } from "@/components/VenuePicker";
import { SecondaryNav } from "@/components/Nav";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Add an update from where you are",
  description:
    "Two questions and the rest of Ottawa knows what a place is like right now. Anonymous, no account needed.",
  path: "/report",
});

/**
 * The Update tab. Its only job is answering "which venue are you at?" in as few
 * taps as possible.
 *
 * Leading with the busiest venues is a good idea only when we know which ones
 * they are. With no recent reports that ordering is meaningless and the heading
 * claiming it is false, so the evidence check decides both.
 */
export default async function ReportPage() {
  const explore = await getExplore();
  const ranked = hasRankingEvidence(explore.rows.map((r) => r.score));

  const source = ranked ? [...explore.reported, ...explore.quiet] : explore.rows;
  const venues: PickerVenue[] = source
    .map((r) => ({
      id: r.venue.id,
      slug: r.venue.slug,
      name: r.venue.name,
      district: r.venue.district,
      kind: r.venue.kind,
      lastReportMinutes: r.score.minutesSinceLast,
    }))
    .sort((a, b) => (ranked ? 0 : a.name.localeCompare(b.name)));

  return (
    <>
      <TopBar contributorsThisHour={explore.contributorsThisHour} />
      <div className="page">
        <h1 className="page-title">You&apos;re out. What&apos;s it like?</h1>
        <p className="page-sub">
          Two questions, no account. It takes about ten seconds and it is the only reason
          anyone else can see what is going on tonight.
        </p>

        <VenuePicker
          venues={venues}
          ranked={ranked}
          heading={ranked ? "Busiest right now" : "Choose a venue"}
        />

        <SecondaryNav />
      </div>
    </>
  );
}

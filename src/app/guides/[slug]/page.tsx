import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, GUIDE_BY_SLUG } from "@/data/guides";
import { getScoresForSlugs } from "@/lib/store";
import { TopBar } from "@/components/TopBar";
import { JsonLd } from "@/components/JsonLd";
import { Score, CrowdMeter } from "@/components/Score";
import { breadcrumbJsonLd, guideJsonLd, pageMetadata } from "@/lib/seo";
import { CROWD_LABEL, DISTRICT_LABEL, KIND_LABEL, lineLabel } from "@/lib/labels";
import { formatPlainDate } from "@/lib/clock";
import type { CrowdLevel, VenueWithScore } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Pre-generate the route list so the guides are in the build output. */
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDE_BY_SLUG.get(slug);
  if (!guide) return {};
  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    type: "article",
  });
}

function GuideVenueRow({ row, note }: { row: VenueWithScore; note: string }) {
  const { venue, score } = row;
  return (
    <Link href={`/v/${venue.slug}`} className="card guide-row">
      <div className="card-row">
        <div className="card-body">
          <div className="venue-name">{venue.name}</div>
          <div className="venue-meta">
            {KIND_LABEL[venue.kind]} · {DISTRICT_LABEL[venue.district]} · {venue.address}
          </div>
          <p className="guide-note">{note}</p>
          <div className="card-facts">
            {score.freshness === "live" && (
              <span className="chip" data-tone="live">
                <span className="pulse" />
                Live
              </span>
            )}
            {score.crowd !== null && (
              <span className="chip">
                <CrowdMeter crowd={score.crowd} />
                {CROWD_LABEL[Math.round(score.crowd) as CrowdLevel]}
              </span>
            )}
            {score.line && score.line !== "none" && (
              <span className="chip">{lineLabel(score.line, venue.kind)}</span>
            )}
          </div>
        </div>
        {score.score !== null && <Score score={score} />}
      </div>
    </Link>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDE_BY_SLUG.get(slug);
  if (!guide) notFound();

  // One data pass for the whole page rather than one per section.
  const allSlugs = guide.sections.flatMap((s) => s.entries.map((e) => e.venueSlug));
  const rows = await getScoresForSlugs(allSlugs);
  const bySlug = new Map(rows.map((r) => [r.venue.slug, r]));

  return (
    <>
      <JsonLd data={guideJsonLd(guide)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Find the Crowd", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: guide.title, path: `/guides/${guide.slug}` },
        ])}
      />
      <TopBar />

      <article className="page">
        <Link href="/guides" className="back-link">
          Back to guides
        </Link>

        <h1 className="page-title guide-title">{guide.title}</h1>
        <p className="source-line" style={{ marginBottom: 16 }}>
          Updated {formatPlainDate(guide.updated)}
        </p>

        {guide.intro.map((para, i) => (
          <p className="guide-para" key={i}>
            {para}
          </p>
        ))}

        {guide.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="guide-heading">{section.heading}</h2>
            {section.intro && <p className="guide-para">{section.intro}</p>}
            {section.entries.map((entry) => {
              const row = bySlug.get(entry.venueSlug);
              if (!row) return null;
              return <GuideVenueRow key={entry.venueSlug} row={row} note={entry.note} />;
            })}
          </section>
        ))}

        <h2 className="guide-heading">Questions people ask</h2>
        {guide.faq.map((item) => (
          <div className="faq" key={item.q}>
            <h3 className="faq-q">{item.q}</h3>
            <p className="faq-a">{item.a}</p>
          </div>
        ))}

        <div className="note" style={{ marginTop: 24 }}>
          The numbers on this page come from people who were in these rooms in the last six
          hours. If you are out tonight,{" "}
          <Link href="/report" style={{ textDecoration: "underline" }}>
            add a report
          </Link>{" "}
          and the next person gets a better answer.
        </div>

        <h2 className="guide-heading">More Ottawa guides</h2>
        {GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
          <Link href={`/guides/${g.slug}`} className="card" key={g.slug}>
            <div className="guide-card-title">{g.title}</div>
            <p className="guide-card-desc">{g.description}</p>
          </Link>
        ))}
      </article>
    </>
  );
}

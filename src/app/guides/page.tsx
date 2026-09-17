import Link from "next/link";
import { GUIDES } from "@/data/guides";
import { TopBar } from "@/components/TopBar";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatPlainMonth } from "@/lib/clock";

export const metadata = pageMetadata({
  title: "Ottawa going out guides",
  description:
    "Short honest guides to going out in Ottawa. Where to go by area, by age group, by night of the week, and where to eat. Every place has a live crowd score.",
  path: "/guides",
});

export default function GuidesIndex() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Find the Crowd", path: "/" },
          { name: "Guides", path: "/guides" },
        ])}
      />
      <TopBar />
      <div className="page">
        <h1 className="page-title">Ottawa guides</h1>
        <p className="page-sub">
          Written by people who go out here. Every place named has a live crowd score, so these
          do not go stale the way a list from three years ago does.
        </p>

        {GUIDES.map((guide) => {
          const places = guide.sections.reduce((n, s) => n + s.entries.length, 0);
          return (
            <Link href={`/guides/${guide.slug}`} className="card" key={guide.slug}>
              <div className="guide-card-title">{guide.title}</div>
              <p className="guide-card-desc">{guide.description}</p>
              <div className="source-line">
                {places} places · updated {formatPlainMonth(guide.updated)}
              </div>
            </Link>
          );
        })}

        <div className="note" style={{ marginTop: 20 }}>
          Something missing or wrong? These are community lists. Tell us and we will fix them.
        </div>
      </div>
    </>
  );
}

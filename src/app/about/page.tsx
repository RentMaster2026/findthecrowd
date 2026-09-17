import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { HALF_LIFE_MIN, MIN_CONFIDENT_REPORTS, WINDOW_MIN } from "@/lib/score";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How the crowd score works",
  description:
    "The score is the share of people who said a place is worth coming to right now. Here is the whole method, including when we do not trust our own number.",
  path: "/about",
});

/**
 * Showing your working is a trust feature, not a legal page. If people don't
 * understand where the number comes from they won't believe it, and if they
 * don't believe it they won't report. Written plainly, on purpose.
 */
export default function AboutPage() {
  return (
    <>
      <TopBar />
      <div className="page">
        <h1 className="page-title">How the score works</h1>
        <p className="page-sub">No algorithm mystique. Here is the whole thing.</p>

        <div className="section-head" style={{ marginTop: 8 }}>
          <h2>The question</h2>
        </div>
        <p style={{ fontSize: 15, color: "var(--text-mid)" }}>
          Everyone who reports a venue answers one question: would you tell a mate to come
          here right now? The score is the percentage who said yes. It is not an average of star
          ratings, and it is not a measure of how nice the place is. It is a headcount of
          people who were actually inside.
        </p>

        <div className="section-head">
          <h2>Recency</h2>
        </div>
        <p style={{ fontSize: 15, color: "var(--text-mid)" }}>
          A report from 9pm tells you almost nothing about midnight, so every report&apos;s
          influence halves every {HALF_LIFE_MIN} minutes and drops out entirely after{" "}
          {WINDOW_MIN / 60} hours. A venue with no recent reports shows no score rather than
          an old one.
        </p>

        <div className="section-head">
          <h2>Crowd is separate</h2>
        </div>
        <p style={{ fontSize: 15, color: "var(--text-mid)" }}>
          Packed and good are different facts. The bars beside each venue show how busy it is;
          the percentage shows whether people think it&apos;s worth being there. A club can be
          rammed and still score 30.
        </p>

        <div className="section-head">
          <h2>When we don&apos;t trust our own number</h2>
        </div>
        <p style={{ fontSize: 15, color: "var(--text-mid)" }}>
          Under {MIN_CONFIDENT_REPORTS} reports the score is greyed out and labelled low signal.
          Two people agreeing is not evidence, and pretending otherwise is the fastest way to
          lose you.
        </p>

        <div className="section-head">
          <h2>Gaming it</h2>
        </div>
        <p style={{ fontSize: 15, color: "var(--text-mid)" }}>
          One device can report a given venue once every 20 minutes and no more than twelve
          times an hour across the city, enforced in the database rather than the app. Reports
          can be confirmed or disputed by other people, which shifts their weight but can never
          delete them. Venues cannot pay to change a score. When promotion arrives it will be
          labelled and it will sit outside the ranking.
        </p>

        <div className="section-head">
          <h2>Your privacy</h2>
        </div>
        <p style={{ fontSize: 15, color: "var(--text-mid)" }}>
          Reporting needs no account. Your device holds a random id used only to enforce the
          cooldown; it is not linked to a name, a phone number or a location history. Reports
          are deleted after 30 days.
        </p>

        <div style={{ marginTop: 26 }}>
          <Link className="btn btn-ghost" href="/">
            Back to tonight
          </Link>
        </div>
      </div>
    </>
  );
}

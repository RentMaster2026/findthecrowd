import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { SecondaryNav } from "@/components/Nav";
import {
  CROWD_FRESH_MIN,
  HALF_LIFE_MIN,
  MIN_CONFIDENT_CONTRIBUTORS,
  QUEUE_FRESH_MIN,
  WINDOW_MIN,
} from "@/lib/score";
import { REPORT_COOLDOWN_MIN, REPORT_HOURLY_LIMIT } from "@/lib/store";
import { NIGHT_CUTOFF_HOUR } from "@/lib/time";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How the score works",
  description:
    "The number is the share of people who said a place is worth going to right now. Here is the whole method, including what we have not built yet.",
  path: "/about",
});

/**
 * Showing your working is a trust feature, not a legal page.
 *
 * Every number on this page is interpolated from the constant the engine
 * actually uses, so the copy cannot drift from the code. The "not built yet"
 * section exists because the previous version of this page described a
 * confirm/dispute feature that has no interface, which is a promise rather than
 * a description.
 */
export default function AboutPage() {
  return (
    <>
      <TopBar />
      <div className="page prose">
        <h1 className="page-title">How the score works</h1>
        <p className="page-sub">No algorithm mystique. Here is the whole thing.</p>

        <h2>The question</h2>
        <p>
          Everyone who reports answers one question: would you tell a mate to come here right
          now? The number is the percentage who said yes. It is a share of people, not how
          full the room is, and not an average of star ratings. A club can be packed and score
          30.
        </p>

        <h2>People, not reports</h2>
        <p>
          The number counts distinct contributors. If the same device reports a venue twice,
          the newer update replaces the older one rather than counting twice, so nobody can
          lift a place by reporting it over and over. The older reports are still stored, they
          just do not get a second vote.
        </p>

        <h2>Different facts go stale at different speeds</h2>
        <p>
          Whether a room is worth being in holds up for a while: a report&apos;s influence
          halves every {HALF_LIFE_MIN} minutes and drops out entirely after {WINDOW_MIN / 60}{" "}
          hours. How busy it is does not hold up nearly as long, so a crowd reading counts as
          current only for {CROWD_FRESH_MIN} minutes. A door queue goes stale faster still and
          expires after {QUEUE_FRESH_MIN} minutes. Past those windows the reading is not shown
          as current; it either shows its age or disappears.
        </p>
        <p>
          These windows are starting choices we are testing during the Ottawa pilot, not
          scientific thresholds. If they turn out to be wrong we will change them and say so.
        </p>

        <h2>When we do not trust our own number</h2>
        <p>
          Under {MIN_CONFIDENT_CONTRIBUTORS} people the number is marked low signal. One
          recent honest update is still useful and we show it, labelled as one person rather
          than dressed up as a consensus. When people disagree, the card says they disagree
          instead of averaging it into a single confident-looking figure.
        </p>
        <p>
          No reports is not a score. A place nobody has reported shows no number at all. It
          does not mean the room is empty, and we will not imply that it does.
        </p>

        <h2>Ranking</h2>
        <p>
          The feed is not sorted by the raw percentage. A 100% from two people should not beat
          an 84% from fifteen, so each score is pulled toward the middle in proportion to how
          little evidence is behind it, then nudged up if the reports are recent. A tiny
          unanimous sample is treated as closer to &quot;we do not know yet&quot; than to
          &quot;best place in the city&quot;. There is no machine learning in it. The whole
          calculation is four lines and we will explain it to any venue that thinks it was
          treated unfairly.
        </p>

        <h2>Nights, not calendar days</h2>
        <p>
          A night runs from {NIGHT_CUTOFF_HOUR}am to {NIGHT_CUTOFF_HOUR}am, in Ottawa time. A
          set that starts at half past midnight belongs to the night before, which is what
          anyone standing in the room would call it. The actual date is always printed next to
          words like &quot;tonight&quot;, so a relative word can never hide which day an event
          is on.
        </p>

        <h2>Events</h2>
        <p>
          An event is listed only when someone has checked it against a page that supports
          that specific event, and every card names that page and the date it was checked. A
          venue&apos;s homepage is not evidence that a particular night runs at a particular
          time for a particular price. Where we have not checked a price, the card says the
          price was not checked rather than guessing one.
        </p>

        <h2>Gaming it</h2>
        <p>
          One device can report a given venue once every {REPORT_COOLDOWN_MIN} minutes and no
          more than {REPORT_HOURLY_LIMIT} times an hour across the city. Both limits are
          enforced by the database, not just the app, because the app runs on the
          attacker&apos;s machine.
        </p>
        <p>
          Reports from venue staff or from us are labelled as such and are kept out of the
          public percentage entirely. Venues cannot pay to change a score. If promotion ever
          arrives it will be labelled and it will sit outside the ranking.
        </p>

        <h2>What we do not claim</h2>
        <p>
          We do not verify that anyone was physically inside a venue. There is no location
          check and no proof of presence, and a report is one anonymous browser saying
          something. The cooldowns make casual manipulation tedious; they do not make it
          impossible.
        </p>
        <p>
          Confirming and disputing other people&apos;s reports is not built yet. The storage
          for it exists and the score engine knows how to use it, but there is no interface,
          so at the moment nothing is being confirmed or disputed by anyone.
        </p>

        <h2>Your privacy</h2>
        <p>
          Reporting needs no account and no email address. Your device holds a random id used
          only to enforce the cooldown; it is not linked to a name, a phone number or a
          location history, and we never ask for location permission. Saved places and group
          votes live in your browser under separate ids that are never joined to your reports.
        </p>
        <p>
          Reports are deleted after 30 days by a scheduled job in the database. That schedule
          is part of the migration in the repository, and it is an operator&apos;s
          responsibility to confirm it is running on any given deployment.
        </p>

        <h2>Something wrong?</h2>
        <p>
          Listing errors go to a form that actually receives them.{" "}
          <Link href="/corrections" className="inline-link">
            Send a correction
          </Link>
          . Crowd updates themselves cannot be edited or deleted by anyone, including us. They
          age out on their own.
        </p>

        <div style={{ marginTop: 26 }}>
          <Link className="btn btn-ghost" href="/">
            Back to Explore
          </Link>
        </div>

        <SecondaryNav />
      </div>
    </>
  );
}

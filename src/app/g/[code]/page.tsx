import Link from "next/link";
import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { GroupVote, type GroupVenue } from "@/components/GroupVote";
import { MigrationMissingError, getShortlistTally } from "@/lib/store";
import { VENUE_BY_ID } from "@/data/venues";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * A private shortlist.
 *
 * `noindex, nofollow` and excluded from the sitemap, because a link somebody
 * sent to four friends should not turn up in a search result. That is not the
 * same as secret, and the page says so in plain words: anyone with the link can
 * open it. Nothing here identifies a participant — no names, no contacts, no
 * count of who has seen it.
 */
export const metadata: Metadata = {
  title: "Where should we go?",
  description: "Vote on where the group is going tonight.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function GroupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let tally;
  try {
    tally = await getShortlistTally(code);
  } catch (err) {
    const migration = err instanceof MigrationMissingError;
    return (
      <Shell>
        <div className="empty">
          <p>Group links are not available on this deployment yet.</p>
          {migration && (
            <p className="empty-sub">
              The database migration that adds shortlists has not been applied.
            </p>
          )}
          <Link href="/" className="inline-link">
            Back to Explore
          </Link>
        </div>
      </Shell>
    );
  }

  if (!tally) {
    return (
      <Shell>
        <div className="empty">
          <p>That group link does not exist.</p>
          <p className="empty-sub">
            It may have been mistyped, or it expired and was cleared.
          </p>
          <Link href="/" className="inline-link">
            Back to Explore
          </Link>
        </div>
      </Shell>
    );
  }

  const venues: GroupVenue[] = tally.shortlist.venueIds
    .map((id) => VENUE_BY_ID.get(id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v))
    .map((v) => ({
      id: v.id,
      slug: v.slug,
      name: v.name,
      district: v.district,
      kind: v.kind,
      address: v.address,
    }));

  return (
    <Shell>
      <h1 className="page-title">{tally.shortlist.title ?? "Where should we go?"}</h1>
      <p className="page-sub">
        Someone shared these options. Tap one. No sign-up, and you can change your mind.
      </p>

      <GroupVote
        initialTally={tally}
        venues={venues}
        url={`${SITE_URL}/g/${tally.shortlist.code}?via=group`}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <div className="page">{children}</div>
    </>
  );
}

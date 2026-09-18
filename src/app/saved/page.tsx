import { TopBar } from "@/components/TopBar";
import { SavedList, type SavedVenue } from "@/components/SavedList";
import { SecondaryNav } from "@/components/Nav";
import { VENUES } from "@/data/venues";
import { SHORTLIST_MAX_VENUES, SHORTLIST_MIN_VENUES, SHORTLIST_TTL_HOURS } from "@/lib/store";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Saved places",
  description:
    "The places you saved, and a way to send two or three of them to your friends so everyone can vote on where to go.",
  path: "/saved",
});

/**
 * Saved is a local list, so this page ships the venue directory and lets the
 * browser match it against what it has saved. Forty-one rows of five fields is
 * a few kilobytes, which is cheaper than an API call and works offline.
 */
export default function SavedPage() {
  const venues: SavedVenue[] = VENUES.map((v) => ({
    id: v.id,
    slug: v.slug,
    name: v.name,
    district: v.district,
    kind: v.kind,
  }));

  return (
    <>
      <TopBar />
      <div className="page">
        <h1 className="page-title">Saved</h1>
        <p className="page-sub">
          Kept on this device. No account, and nothing here is shared until you make a group
          link.
        </p>

        <SavedList
          venues={venues}
          minVenues={SHORTLIST_MIN_VENUES}
          maxVenues={SHORTLIST_MAX_VENUES}
          ttlHours={SHORTLIST_TTL_HOURS}
        />

        <SecondaryNav />
      </div>
    </>
  );
}

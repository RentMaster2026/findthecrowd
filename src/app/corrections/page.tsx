import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { CorrectionForm } from "@/components/CorrectionForm";
import { SecondaryNav } from "@/components/Nav";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Tell us something is wrong",
  description:
    "Report a wrong opening time, a bad event listing, a missing venue or anything else we have got wrong in Ottawa.",
  path: "/corrections",
});

const TYPES = ["venue", "event", "other"] as const;

export default async function CorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  const { type, id } = await searchParams;
  const defaultType = TYPES.includes(type as (typeof TYPES)[number])
    ? (type as (typeof TYPES)[number])
    : "other";

  return (
    <>
      <TopBar />
      <div className="page">
        <Link href="/" className="back-link">
          Back to Explore
        </Link>

        <h1 className="page-title">Something wrong?</h1>
        <p className="page-sub">
          Venue details and event listings are compiled from public pages and they go stale.
          Tell us what is wrong and we will fix it.
        </p>

        <CorrectionForm defaultType={defaultType} defaultSubjectId={id ?? null} />

        <p className="source-line" style={{ marginTop: 20 }}>
          This is for listing errors. Crowd updates cannot be edited or deleted by anyone,
          including us. They age out of the score on their own.{" "}
          <Link href="/about" className="inline-link">
            How the score works
          </Link>
          .
        </p>

        <SecondaryNav />
      </div>
    </>
  );
}

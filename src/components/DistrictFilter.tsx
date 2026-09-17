"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DISTRICT_LABEL } from "@/lib/labels";
import type { District } from "@/lib/types";

/**
 * District filter. Ottawa nightlife is geographically concentrated, so "where
 * am I walking to" is the first cut people make — before type of venue, before
 * price. It goes above the feed, not behind a filter icon.
 */
export function DistrictFilter({ districts }: { districts: District[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("district");

  function select(value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("district", value);
    else next.delete("district");
    router.replace(next.toString() ? `?${next}` : "/", { scroll: false });
  }

  return (
    <div className="filters" role="group" aria-label="Filter by district">
      <button className="filter" data-active={!active} onClick={() => select(null)}>
        All Ottawa
      </button>
      {districts.map((d) => (
        <button
          key={d}
          className="filter"
          data-active={active === d}
          aria-pressed={active === d}
          onClick={() => select(d)}
        >
          {DISTRICT_LABEL[d]}
        </button>
      ))}
    </div>
  );
}

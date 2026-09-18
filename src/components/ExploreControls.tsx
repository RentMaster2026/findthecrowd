"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DISTRICT_LABEL } from "@/lib/labels";
import type { District } from "@/lib/types";

/**
 * Explore controls: the Now/Tonight switch, a search box, and filters.
 *
 * Everything lives in the URL. That is what makes a filtered view shareable,
 * what makes the browser Back button restore the exact list someone was looking
 * at, and what lets the server render the right thing on first paint. The old
 * version put ten district chips permanently above the feed; that is a wall of
 * chips, so the neighbourhood picker is a select and the activity filter is a
 * short row, both behind a disclosure that says how many are active.
 *
 * `scroll: false` on every update is deliberate. Changing a filter should not
 * throw you back to the top of a list you were halfway down.
 */

const DISTRICTS: District[] = [
  "byward",
  "elgin",
  "centretown",
  "lansdowne",
  "hintonburg",
  "little-italy",
  "chinatown",
  "sandy-hill",
  "wellington-west",
  "westboro",
];

const ACTIVITIES = [
  { value: "club", label: "Clubs" },
  { value: "bar", label: "Bars" },
  { value: "pub", label: "Pubs" },
  { value: "live-music", label: "Live music" },
] as const;

export function ExploreControls({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const searchId = useId();
  const panelId = useId();

  const view = params.get("view") === "tonight" ? "tonight" : "now";
  const district = params.get("district") ?? "";
  const kind = params.get("kind") ?? "";
  const q = params.get("q") ?? "";

  const [draft, setDraft] = useState(q);
  const [open, setOpen] = useState(Boolean(district || kind));
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in step when the URL changes from somewhere else (Back, a
  // link, the Clear button) without fighting the person while they are typing.
  useEffect(() => {
    setDraft(q);
  }, [q]);

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  function push(next: URLSearchParams) {
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  }

  function onSearch(value: string) {
    setDraft(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam("q", value.trim() || null), 250);
  }

  const activeFilters = (district ? 1 : 0) + (kind ? 1 : 0);

  return (
    <div className="controls">
      <div className="switch" role="group" aria-label="What to show">
        <button
          type="button"
          data-on={view === "now"}
          aria-pressed={view === "now"}
          onClick={() => setParam("view", null)}
        >
          Now
        </button>
        <button
          type="button"
          data-on={view === "tonight"}
          aria-pressed={view === "tonight"}
          onClick={() => setParam("view", "tonight")}
        >
          Tonight
        </button>
      </div>

      <div className="control-row">
        <label className="sr-only" htmlFor={searchId}>
          Search venues by name or neighbourhood
        </label>
        <input
          id={searchId}
          type="search"
          className="search-input"
          value={draft}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search a place or area"
          autoComplete="off"
        />
        <button
          type="button"
          className="filter-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          Filters
          {activeFilters > 0 && <span className="filter-count">{activeFilters}</span>}
        </button>
      </div>

      <div id={panelId} className="filter-panel" hidden={!open}>
        <label className="filter-field">
          <span>Area</span>
          <select value={district} onChange={(e) => setParam("district", e.target.value || null)}>
            <option value="">All Ottawa</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {DISTRICT_LABEL[d]}
              </option>
            ))}
          </select>
        </label>

        <div className="filter-field">
          <span id={`${panelId}-activity`}>Activity</span>
          <div className="filter-chips" role="group" aria-labelledby={`${panelId}-activity`}>
            {ACTIVITIES.map((a) => (
              <button
                key={a.value}
                type="button"
                className="filter"
                data-active={kind === a.value}
                aria-pressed={kind === a.value}
                onClick={() => setParam("kind", kind === a.value ? null : a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {(activeFilters > 0 || q) && (
          <button
            type="button"
            className="link-button"
            onClick={() => push(new URLSearchParams(view === "tonight" ? { view } : {}))}
          >
            Clear filters
          </button>
        )}
      </div>

      <p className="result-count" role="status">
        {resultCount} {resultCount === 1 ? "place" : "places"}
        {district ? ` in ${DISTRICT_LABEL[district as District]}` : ""}
      </p>
    </div>
  );
}

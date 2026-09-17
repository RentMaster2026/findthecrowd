"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CROWD_LABEL,
  TAG_LABEL,
  lineLabel,
  lineQuestion,
  tagOrder,
  venueClass,
} from "@/lib/labels";
import { getReporterId } from "@/lib/reporter";
import type { CrowdLevel, LineLength, VenueKind, VibeTag } from "@/lib/types";

/**
 * The report sheet.
 *
 * The whole product depends on people finishing this in a dark room with one
 * hand. So: every input is a tap target, nothing is typed, and only two of the
 * five fields are required. "Worth it" and "how busy" are the two — everything
 * below the divider is optional detail.
 */

const CROWD_STEPS: CrowdLevel[] = [1, 2, 3, 4, 5];
const LINE_STEPS: LineLength[] = ["none", "short", "long", "brutal"];
const COVER_STEPS: (number | null)[] = [null, 0, 10, 15, 20, 25];

export function ReportSheet({
  venueId,
  venueName,
  venueKind,
  onClose,
}: {
  venueId: string;
  venueName: string;
  venueKind: VenueKind;
  onClose: () => void;
}) {
  const food = venueClass(venueKind) === "food";
  const router = useRouter();
  const [worthIt, setWorthIt] = useState<boolean | null>(null);
  const [crowd, setCrowd] = useState<CrowdLevel | null>(null);
  // `null` here means "not answered", which is different from the value the
  // report defaults to. Without this, the optional fields render as if the
  // person had already answered them.
  const [line, setLine] = useState<LineLength | null>(null);
  const [cover, setCover] = useState<number | null>(null);
  const [coverSet, setCoverSet] = useState(false);
  const [tags, setTags] = useState<VibeTag[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function toggleTag(tag: VibeTag) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : current.length >= 3
          ? current
          : [...current, tag]
    );
  }

  async function submit() {
    if (worthIt === null || crowd === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          reporterId: getReporterId(),
          worthIt,
          crowd,
          line: line ?? "none",
          cover: coverSet ? cover : null,
          tags,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error ?? "Could not save that report.");
        setBusy(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("You appear to be offline. Try again when you have signal.");
      setBusy(false);
    }
  }

  const ready = worthIt !== null && crowd !== null;

  return (
    <div className="sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <h2>Report {venueName}</h2>
            <p>Two taps is a valid report. The rest is optional.</p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="field">
          <label id="worth-label">Would you tell a mate to come here right now?</label>
          <div className="verdict" role="group" aria-labelledby="worth-label">
            <button
              data-value="yes"
              data-on={worthIt === true}
              aria-pressed={worthIt === true}
              onClick={() => setWorthIt(true)}
            >
              Yes, come
            </button>
            <button
              data-value="no"
              data-on={worthIt === false}
              aria-pressed={worthIt === false}
              onClick={() => setWorthIt(false)}
            >
              Not right now
            </button>
          </div>
        </div>

        <div className="field">
          <label id="crowd-label">How busy is it?</label>
          <div className="segment" data-tone="hot" role="group" aria-labelledby="crowd-label">
            {CROWD_STEPS.map((c) => (
              <button
                key={c}
                data-on={crowd === c}
                aria-pressed={crowd === c}
                onClick={() => setCrowd(c)}
              >
                {CROWD_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        <div className="field">
          <label id="line-label">{lineQuestion(venueKind)}</label>
          <div className="segment" role="group" aria-labelledby="line-label">
            {LINE_STEPS.map((l) => (
              <button key={l} data-on={line === l} aria-pressed={line === l} onClick={() => setLine(l)}>
                {l === "none"
                  ? food
                    ? "None"
                    : "None"
                  : lineLabel(l, venueKind).replace(" line", "").replace(" wait", "")}
              </button>
            ))}
          </div>
        </div>

        {!food && (
        <div className="field">
          <label id="cover-label">Cover charge</label>
          <div className="segment" role="group" aria-labelledby="cover-label">
            {COVER_STEPS.map((c) => (
              <button
                key={String(c)}
                data-on={coverSet && cover === c}
                aria-pressed={coverSet && cover === c}
                onClick={() => {
                  setCover(c);
                  setCoverSet(true);
                }}
              >
                {c === null ? "Didn't see" : c === 0 ? "Free" : `$${c}`}
              </button>
            ))}
          </div>
        </div>
        )}

        <div className="field">
          <label>Anything else? Up to 3.</label>
          <div className="tagwrap">
            {tagOrder(venueKind).map((tag) => (
              <button
                key={tag}
                data-on={tags.includes(tag)}
                aria-pressed={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                {TAG_LABEL[tag]}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="note">{error}</div>}

        <button className="btn" disabled={!ready || busy} onClick={submit}>
          {busy ? "Sending…" : ready ? "Send report" : "Pick the two above"}
        </button>
      </div>
    </div>
  );
}

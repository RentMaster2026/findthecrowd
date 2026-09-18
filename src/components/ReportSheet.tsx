"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShareButton } from "./ShareButton";
import {
  CROWD_LABEL,
  TAG_LABEL,
  lineLabel,
  lineQuestion,
  tagOrder,
  venueClass,
} from "@/lib/labels";
import { getReporterId } from "@/lib/reporter";
import { canonical } from "@/lib/seo";
import { track } from "@/lib/analytics";
import type { CrowdLevel, LineLength, VenueKind, VibeTag } from "@/lib/types";

/**
 * The report sheet.
 *
 * The whole product depends on people finishing this in a dark room with one
 * hand, so the short path is visually short: two questions, then the send
 * button. Everything else is behind "Add details" and collapsed by default.
 * The previous version also required only two answers, but it put the queue,
 * the cover and ten tags on screen above the button, so finishing meant
 * scrolling past eight optional choices. Required-only has to LOOK
 * required-only or it is not a short path.
 *
 * State handling is the other half. Success is shown only after the server
 * accepts. A failure keeps every answer and offers retry. A second tap while a
 * request is in flight does nothing.
 */

const CROWD_STEPS: CrowdLevel[] = [1, 2, 3, 4, 5];
const LINE_STEPS: LineLength[] = ["none", "short", "long", "brutal"];
const COVER_STEPS: (number | null)[] = [null, 0, 10, 15, 20, 25];

type Phase =
  | { kind: "editing" }
  | { kind: "saving" }
  | { kind: "error"; message: string; retryable: boolean }
  | { kind: "done" };

export function ReportSheet({
  venueId,
  venueSlug,
  venueName,
  venueKind,
  onClose,
}: {
  venueId: string;
  venueSlug?: string;
  venueName: string;
  venueKind: VenueKind;
  onClose: () => void;
}) {
  const food = venueClass(venueKind) === "food";
  const router = useRouter();
  const titleId = useId();

  const [crowd, setCrowd] = useState<CrowdLevel | null>(null);
  const [worthIt, setWorthIt] = useState<boolean | null>(null);
  const [line, setLine] = useState<LineLength | null>(null);
  const [cover, setCover] = useState<number | null>(null);
  const [coverSet, setCoverSet] = useState(false);
  const [tags, setTags] = useState<VibeTag[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "editing" });

  const sheetRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const inFlight = useRef(false);

  const close = useCallback(() => {
    // Closing mid-request would leave a write with nothing listening to it.
    if (inFlight.current) return;
    onClose();
  }, [onClose]);

  /* Dialog behaviour: focus in, focus trapped, Escape out, focus returned. */
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;

      /**
       * Only elements that can actually take focus.
       *
       * The collapsed "Add details" section is `hidden`, so its buttons still
       * match the selector but can never be focused. Including them made the
       * computed "last" element unreachable, and tabbing past the real last
       * control escaped the dialog into the browser chrome instead of wrapping.
       */
      const focusable = [
        ...sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((el) => el.getClientRects().length > 0);

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [close]);

  useEffect(() => {
    track("report_started", { venueId });
  }, [venueId]);

  function toggleTag(tag: VibeTag) {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : current.length >= 3
          ? current
          : [...current, tag]
    );
  }

  const ready = crowd !== null && worthIt !== null;

  async function submit() {
    if (!ready || inFlight.current) return;
    inFlight.current = true;
    setPhase({ kind: "saving" });

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

      let payload: { error?: string; ok?: boolean } = {};
      try {
        payload = await res.json();
      } catch {
        /* A non-JSON body is still a failure; the status tells us enough. */
      }

      if (!res.ok) {
        inFlight.current = false;
        setPhase({
          kind: "error",
          message: payload.error ?? "Could not save that update.",
          // A cooldown is not retryable; a server error is.
          retryable: res.status !== 429 && res.status !== 400,
        });
        track("report_rejected", { venueId, status: res.status });
        return;
      }

      // Only now. Anything earlier is a thank-you for a report nobody has.
      inFlight.current = false;
      setPhase({ kind: "done" });
      track("report_submitted", { venueId });
      router.refresh();
    } catch {
      inFlight.current = false;
      setPhase({
        kind: "error",
        message: "No connection. Your answers are still here, try again when you have signal.",
        retryable: true,
      });
      track("report_rejected", { venueId, status: 0 });
    }
  }

  if (phase.kind === "done") {
    return (
      <Backdrop onClose={close}>
        <div className="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="sheet-head">
            <h2 id={titleId}>Thanks</h2>
            <button className="sheet-close" onClick={close} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
          <p className="sheet-done">
            {venueName} now shows <strong>{CROWD_LABEL[crowd as CrowdLevel]}</strong> and your{" "}
            {worthIt ? "yes" : "not right now"}. It counts for the next six hours and fades as
            it ages.
          </p>
          <div className="sheet-actions">
            {venueSlug && (
              <ShareButton
                url={canonical(`/v/${venueSlug}`)}
                title={venueName}
                venueId={venueId}
              >
                Share this place
              </ShareButton>
            )}
            <button className="btn" onClick={close}>
              Done
            </button>
          </div>
        </div>
      </Backdrop>
    );
  }

  const saving = phase.kind === "saving";

  return (
    <Backdrop onClose={close}>
      <div className="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <div>
            <h2 id={titleId}>{venueName}</h2>
            <p>Two questions. Anonymous, no account.</p>
          </div>
          <button className="sheet-close" onClick={close} aria-label="Close" disabled={saving}>
            <CloseIcon />
          </button>
        </div>

        <div className="field">
          <label id="crowd-label">How busy is it?</label>
          <div className="segment segment-tall" data-tone="hot" role="group" aria-labelledby="crowd-label">
            {CROWD_STEPS.map((c, i) => (
              <button
                key={c}
                ref={i === 0 ? firstFieldRef : undefined}
                type="button"
                data-on={crowd === c}
                aria-pressed={crowd === c}
                onClick={() => setCrowd(c)}
                disabled={saving}
              >
                {CROWD_LABEL[c]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label id="worth-label">Worth coming right now?</label>
          <div className="verdict" role="group" aria-labelledby="worth-label">
            <button
              type="button"
              data-value="yes"
              data-on={worthIt === true}
              aria-pressed={worthIt === true}
              onClick={() => setWorthIt(true)}
              disabled={saving}
            >
              Yes
            </button>
            <button
              type="button"
              data-value="no"
              data-on={worthIt === false}
              aria-pressed={worthIt === false}
              onClick={() => setWorthIt(false)}
              disabled={saving}
            >
              Not right now
            </button>
          </div>
        </div>

        {phase.kind === "error" && (
          <div className="note note-error" role="alert">
            {phase.message}
          </div>
        )}

        <button className="btn btn-submit" disabled={!ready || saving} onClick={submit}>
          {saving
            ? "Sending…"
            : phase.kind === "error" && phase.retryable
              ? "Try again"
              : ready
                ? "Send update"
                : "Answer both to send"}
        </button>

        <button
          type="button"
          className="details-toggle"
          aria-expanded={detailsOpen}
          aria-controls="report-details"
          onClick={() => setDetailsOpen((v) => !v)}
          disabled={saving}
        >
          {detailsOpen ? "Hide details" : "Add details"}
          <span className="details-hint">optional</span>
        </button>

        <div id="report-details" hidden={!detailsOpen}>
          <div className="field">
            <label id="line-label">{lineQuestion(venueKind)}</label>
            <div className="segment" role="group" aria-labelledby="line-label">
              {LINE_STEPS.map((l) => (
                <button
                  key={l}
                  type="button"
                  data-on={line === l}
                  aria-pressed={line === l}
                  onClick={() => setLine(line === l ? null : l)}
                  disabled={saving}
                >
                  {l === "none"
                    ? "None"
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
                    type="button"
                    data-on={coverSet && cover === c}
                    aria-pressed={coverSet && cover === c}
                    onClick={() => {
                      setCover(c);
                      setCoverSet(true);
                    }}
                    disabled={saving}
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
                  type="button"
                  data-on={tags.includes(tag)}
                  aria-pressed={tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                  disabled={saving}
                >
                  {TAG_LABEL[tag]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="sheet-foot">
          No account, no location access. Your device keeps a random id so the same phone
          cannot report the same place twice in 20 minutes.
        </p>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

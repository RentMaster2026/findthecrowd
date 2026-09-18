"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

type Phase =
  | { kind: "editing" }
  | { kind: "sending" }
  | { kind: "error"; message: string }
  | { kind: "sent"; stored: "database" | "server-log" };

/**
 * The correction form.
 *
 * Success is only shown after the server says it stored the message, and the
 * confirmation says where it went. If this deployment has no database, the
 * message goes to the server log and the person is told exactly that, because
 * "thanks, we'll look into it" over a dropped message is worse than saying
 * nothing.
 */
export function CorrectionForm({
  defaultType,
  defaultSubjectId,
}: {
  defaultType: "venue" | "event" | "other";
  defaultSubjectId: string | null;
}) {
  const [subjectType, setSubjectType] = useState(defaultType);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "editing" });
  const inFlight = useRef(false);

  const typeId = useId();
  const messageId = useId();
  const contactId = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (message.trim().length < 10) {
      setPhase({ kind: "error", message: "Tell us a bit more about what is wrong." });
      return;
    }

    inFlight.current = true;
    setPhase({ kind: "sending" });
    try {
      const res = await fetch("/api/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectType,
          subjectId: defaultSubjectId,
          message: message.trim(),
          contact: contact.trim() || null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      inFlight.current = false;

      if (!res.ok) {
        setPhase({ kind: "error", message: payload.error ?? "Could not send that." });
        return;
      }
      setPhase({ kind: "sent", stored: payload.stored });
      track("correction_submitted", { subjectType });
    } catch {
      inFlight.current = false;
      setPhase({
        kind: "error",
        message: "No connection. Your message is still here, try again when you have signal.",
      });
    }
  }

  if (phase.kind === "sent") {
    return (
      <div className="note" role="status">
        <p>
          <strong>Sent.</strong>{" "}
          {phase.stored === "database"
            ? "It is recorded and a person will read it. We cannot promise how fast."
            : "This deployment has no database connected, so your message went to the server log. It is recorded, but it may not reach anyone quickly."}
        </p>
        <Link href="/" className="inline-link">
          Back to Explore
        </Link>
      </div>
    );
  }

  const sending = phase.kind === "sending";

  return (
    <form onSubmit={submit} className="correction-form">
      <div className="field">
        <label htmlFor={typeId}>What is wrong?</label>
        <select
          id={typeId}
          value={subjectType}
          onChange={(e) => setSubjectType(e.target.value as typeof subjectType)}
          disabled={sending}
        >
          <option value="venue">A venue detail (address, hours, type, missing place)</option>
          <option value="event">An event listing (date, time, price, cancelled)</option>
          <option value="other">Something else</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor={messageId}>Tell us what it should say</label>
        <textarea
          id={messageId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={2000}
          required
          minLength={10}
          disabled={sending}
          placeholder="For example: the Saturday night listed at 10pm actually starts at 11, and there is no cover before midnight."
        />
        {defaultSubjectId && (
          <p className="field-hint">
            We will attach this to <code>{defaultSubjectId}</code>.
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={contactId}>
          Email, if you want a reply <span className="field-optional">optional</span>
        </label>
        <input
          id={contactId}
          type="email"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          disabled={sending}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <p className="field-hint">
          Leave it blank and the correction is completely anonymous. We only use it to reply
          about this message.
        </p>
      </div>

      {phase.kind === "error" && (
        <div className="note note-error" role="alert">
          {phase.message}
        </div>
      )}

      <button className="btn" type="submit" disabled={sending}>
        {sending ? "Sending…" : "Send correction"}
      </button>
    </form>
  );
}

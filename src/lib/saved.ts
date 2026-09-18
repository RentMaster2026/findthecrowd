"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Saved venues.
 *
 * Local to the browser on purpose. Saving a couple of places before you leave
 * the house does not need an account, a sync service or a row in a table, and
 * asking for one would put a login in front of the only thing this product is
 * for. The shortlist link is what makes a saved list shareable, and that is a
 * deliberate, explicit step.
 */

const KEY = "findthecrowd:saved";
const EVENT = "findthecrowd:saved-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    // Private mode, blocked storage, or someone else's JSON. Saved venues are a
    // convenience; losing them must never break the page.
    return [];
  }
}

function write(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* Storage unavailable. The in-memory state below still works this session. */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Subscribe to the saved list.
 *
 * `hydrated` exists because the server cannot know what this browser saved. Any
 * component that renders a saved/unsaved state has to wait for it, or React
 * hydration mismatches and the first paint flickers.
 */
export function useSaved() {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(read());
    setHydrated(true);

    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    // Another tab of the same site counts as the same person.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    write(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { ids, hydrated, toggle, remove, clear, isSaved: (id: string) => ids.includes(id) };
}

/**
 * Anonymous voter identity for group shortlists.
 *
 * Separate from the reporter id so a vote can never be joined to a crowd
 * report. It limits casual duplicate voting in one browser. It is NOT proof of
 * a unique human and nothing in the UI describes it that way.
 */
const VOTER_KEY = "findthecrowd:voter-id";

export function getVoterId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(VOTER_KEY);
    if (existing) return existing;
    const id = `v_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    window.localStorage.setItem(VOTER_KEY, id);
    return id;
  } catch {
    return `v_ephemeral_${Math.random().toString(36).slice(2, 12)}`;
  }
}

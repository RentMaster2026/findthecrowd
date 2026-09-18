import { describe, expect, it } from "vitest";
import {
  VERIFIED_ONE_OFFS,
  VERIFIED_RECURRING,
  eventsForNights,
  upcomingNights,
} from "./events";
import { SAMPLE_RECURRING } from "./events.sample";
import { VENUE_BY_ID } from "./venues";
import { nightOf, ottawaInstant } from "@/lib/time";

/**
 * Event integrity.
 *
 * Most of these are regression tests for things the deployed site got wrong:
 * a next-day event rendered as tonight, an after-midnight set with no date at
 * all, and a weekly "REDBLACKS home game" that the real schedule contradicts.
 */

const FRIDAY_11PM = ottawaInstant("2026-09-18", "23:00"); // Friday night

describe("provenance", () => {
  it("gives every verified event a real supporting URL and a checked date", () => {
    for (const def of [...VERIFIED_RECURRING, ...VERIFIED_ONE_OFFS]) {
      expect(def.source.url, def.title).toMatch(/^https?:\/\//);
      expect(def.source.checkedAt, def.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(def.source.label.length, def.title).toBeGreaterThan(3);
    }
  });

  it("points every verified venue id at a venue that exists", () => {
    for (const def of [...VERIFIED_RECURRING, ...VERIFIED_ONE_OFFS]) {
      expect(VENUE_BY_ID.has(def.venueId), def.venueId).toBe(true);
    }
  });

  it("never lets an unverified sample reach a public listing", () => {
    const nights = upcomingNights(FRIDAY_11PM, 7);
    const publicEvents = eventsForNights(nights, FRIDAY_11PM);
    expect(publicEvents.every((e) => e.verified)).toBe(true);
    expect(publicEvents.every((e) => e.source.url !== "")).toBe(true);
  });

  it("marks sample fixtures unverified when a dev preview asks for them", () => {
    const nights = upcomingNights(FRIDAY_11PM, 7);
    const all = eventsForNights(nights, FRIDAY_11PM, { includeUnverified: true });
    expect(all.length).toBeGreaterThan(eventsForNights(nights, FRIDAY_11PM).length);
    expect(all.some((e) => !e.verified)).toBe(true);
  });
});

describe("the REDBLACKS listing", () => {
  it("no longer generates a home game every week", () => {
    const weekly = SAMPLE_RECURRING.filter((d) => d.venueId === "v-td-place");
    expect(weekly).toHaveLength(0);
  });

  it("lists the one real home date, on the right night", () => {
    const game = VERIFIED_ONE_OFFS.find((d) => d.title.includes("REDBLACKS"));
    expect(game?.night).toBe("2026-09-26");
    // Sept 19 is Ottawa AT Calgary. Nothing may be generated at TD Place then.
    const sept19 = eventsForNights(["2026-09-19"], ottawaInstant("2026-09-19", "08:00"), {
      includeUnverified: true,
    });
    expect(sept19.some((e) => e.venueId === "v-td-place")).toBe(false);
  });

  it("says the price was not checked rather than inventing one", () => {
    const game = VERIFIED_ONE_OFFS.find((d) => d.title.includes("REDBLACKS"));
    expect(game?.price.kind).toBe("unknown");
  });
});

describe("nights and dates", () => {
  it("puts an after-midnight set on the night before, with the next day's date", () => {
    const def = SAMPLE_RECURRING.find((d) => d.title === "Upstairs after midnight");
    expect(def?.time).toBe("00:30");
    expect(def?.nightWeekday).toBe(6); // Saturday NIGHT

    const saturdayNight = "2026-09-19";
    const [event] = eventsForNights([saturdayNight], ottawaInstant(saturdayNight, "20:00"), {
      includeUnverified: true,
    }).filter((e) => e.title === "Upstairs after midnight");

    expect(event.nightOf).toBe(saturdayNight);
    // ...but the instant is on Sunday the 20th, at 12:30am Ottawa.
    expect(event.startsAt).toBe("2026-09-20T04:30:00.000Z");
    expect(nightOf(new Date(event.startsAt))).toBe(saturdayNight);
  });

  it("never files a future event under the current night", () => {
    const thursdayNight = "2026-09-17";
    const events = eventsForNights(
      upcomingNights(ottawaInstant(thursdayNight, "23:00"), 3),
      ottawaInstant(thursdayNight, "23:00"),
      { includeUnverified: true }
    );
    const friday = events.filter((e) => e.nightOf === "2026-09-18");
    expect(friday.length).toBeGreaterThan(0);
    // The precise bug: a Friday event carrying Thursday's night.
    for (const event of friday) {
      expect(event.nightOf).not.toBe(thursdayNight);
      expect(nightOf(new Date(event.startsAt))).toBe(event.nightOf);
    }
  });

  it("keeps an event on its night across a DST change", () => {
    // Spring forward is the night of 2026-03-07 into the 8th.
    const night = "2026-03-07";
    const events = eventsForNights([night], ottawaInstant(night, "18:00"), {
      includeUnverified: true,
    });
    for (const event of events) {
      expect(nightOf(new Date(event.startsAt))).toBe(night);
    }
  });

  it("generates the same instants whatever the server timezone thinks", () => {
    const events = eventsForNights(["2026-09-19"], ottawaInstant("2026-09-19", "18:00"), {
      includeUnverified: true,
    });
    // Every startsAt is an absolute instant, so it ends in Z and parses back.
    for (const event of events) {
      expect(event.startsAt).toMatch(/Z$/);
      expect(new Date(event.startsAt).toISOString()).toBe(event.startsAt);
    }
  });
});

describe("finished events", () => {
  it("drops an event that has already ended", () => {
    const night = "2026-09-19";
    const lateEvening = ottawaInstant(night, "20:00");
    const nextMorning = ottawaInstant("2026-09-20", "04:00");

    const early = eventsForNights([night], lateEvening, { includeUnverified: true });
    const late = eventsForNights([night], nextMorning, { includeUnverified: true });
    expect(late.length).toBeLessThan(early.length);
    for (const event of late) {
      expect(new Date(event.endsAt as string).getTime()).toBeGreaterThanOrEqual(
        nextMorning.getTime()
      );
    }
  });

  it("can be asked to keep them, for an operator coverage view", () => {
    const night = "2026-09-19";
    const nextMorning = ottawaInstant("2026-09-20", "04:00");
    const kept = eventsForNights([night], nextMorning, {
      includeUnverified: true,
      dropFinished: false,
    });
    expect(kept.length).toBeGreaterThan(0);
  });
});

describe("upcomingNights", () => {
  it("starts from the night in progress, not the calendar date", () => {
    // 1am Saturday is still Friday night.
    const smallHours = ottawaInstant("2026-09-19", "01:00");
    expect(upcomingNights(smallHours, 2)).toEqual(["2026-09-18", "2026-09-19"]);
  });
});

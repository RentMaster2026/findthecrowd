import { describe, expect, it } from "vitest";
import { openRank, openStateFor } from "./hours";
import { ottawaInstant } from "./time";
import type { OpeningHours, Venue } from "./types";

const SOURCE = { label: "Test", url: "https://example.com", checkedAt: "2026-09-17" };

function venue(hours?: OpeningHours): Venue {
  return {
    id: "v-test",
    slug: "test",
    name: "Test",
    kind: "bar",
    district: "byward",
    address: "1 Test St",
    lat: 45.4,
    lng: -75.7,
    blurb: "",
    capacityBand: "medium",
    typicalCover: null,
    agePolicy: "19+",
    hours,
  };
}

/** Open 10pm to 2am, every night. The normal nightclub shape. */
const lateWeek: OpeningHours = {
  week: Array.from({ length: 7 }, () => ({ open: "22:00", close: "02:00" })),
  source: SOURCE,
};

describe("openStateFor", () => {
  it("says hours are unconfirmed rather than guessing", () => {
    expect(openStateFor(venue(), ottawaInstant("2026-09-19", "23:00")).kind).toBe(
      "unconfirmed"
    );
  });

  it("does not treat unconfirmed as closed", () => {
    const state = openStateFor(venue(), ottawaInstant("2026-09-19", "23:00"));
    expect(state.kind).not.toBe("closed-tonight");
    expect(state.kind).not.toBe("open");
  });

  it("reports open inside published hours", () => {
    const state = openStateFor(venue(lateWeek), ottawaInstant("2026-09-19", "23:00"));
    expect(state.kind).toBe("open");
  });

  it("stays open past midnight, which is when most of these rooms are busiest", () => {
    // 1am Sunday is still Saturday night's opening.
    const state = openStateFor(venue(lateWeek), ottawaInstant("2026-09-20", "01:00"));
    expect(state.kind).toBe("open");
  });

  it("reports opens-later before the doors, with the actual time", () => {
    const state = openStateFor(venue(lateWeek), ottawaInstant("2026-09-19", "19:00"));
    expect(state.kind).toBe("opens-later");
    if (state.kind === "opens-later") {
      expect(state.opensAt).toBe(ottawaInstant("2026-09-19", "22:00").toISOString());
    }
  });

  it("reports closed after last call", () => {
    const state = openStateFor(venue(lateWeek), ottawaInstant("2026-09-20", "03:00"));
    expect(state.kind).toBe("closed-tonight");
  });

  it("reports closed on a night with no hours entry", () => {
    const mondayClosed: OpeningHours = {
      week: [null, null, null, null, null, null, null],
      source: SOURCE,
    };
    expect(openStateFor(venue(mondayClosed), ottawaInstant("2026-09-19", "23:00")).kind).toBe(
      "closed-tonight"
    );
  });

  it("handles a daytime venue that closes the same evening", () => {
    const daytime: OpeningHours = {
      week: Array.from({ length: 7 }, () => ({ open: "11:00", close: "23:00" })),
      source: SOURCE,
    };
    expect(openStateFor(venue(daytime), ottawaInstant("2026-09-19", "20:00")).kind).toBe("open");
    expect(openStateFor(venue(daytime), ottawaInstant("2026-09-19", "23:30")).kind).toBe(
      "closed-tonight"
    );
  });
});

describe("openRank", () => {
  it("orders open, then opening later, then unconfirmed, then closed", () => {
    expect(openRank({ kind: "open", closesAt: "" })).toBeGreaterThan(
      openRank({ kind: "opens-later", opensAt: "" })
    );
    expect(openRank({ kind: "opens-later", opensAt: "" })).toBeGreaterThan(
      openRank({ kind: "unconfirmed" })
    );
    expect(openRank({ kind: "unconfirmed" })).toBeGreaterThan(
      openRank({ kind: "closed-tonight" })
    );
  });
});

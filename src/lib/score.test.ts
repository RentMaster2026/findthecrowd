import { describe, expect, it } from "vitest";
import {
  CROWD_FRESH_MIN,
  MIN_CONFIDENT_CONTRIBUTORS,
  QUEUE_FRESH_MIN,
  WINDOW_MIN,
  bandFor,
  computeVibeScore,
  freshnessFor,
  hasRankingEvidence,
  latestPerContributor,
  rankValue,
  recencyWeight,
  trustWeight,
} from "./score";
import type { CrowdLevel, CrowdReport, LineLength, ReporterRole, VibeTag } from "./types";

const NOW = new Date("2026-09-19T03:00:00.000Z"); // 11pm Ottawa, Friday

let seq = 0;
function report(
  overrides: Partial<CrowdReport> & { minutesAgo: number }
): CrowdReport {
  const { minutesAgo, ...rest } = overrides;
  seq += 1;
  return {
    id: `r${seq}`,
    venueId: "v-test",
    reporterId: `d_person${seq}`,
    createdAt: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
    crowd: 3 as CrowdLevel,
    line: "none" as LineLength,
    cover: null,
    worthIt: true,
    tags: [] as VibeTag[],
    netConfirms: 0,
    ...rest,
  };
}

describe("decay and weighting", () => {
  it("halves a report's weight every half life", () => {
    expect(recencyWeight(0)).toBe(1);
    expect(recencyWeight(90)).toBeCloseTo(0.5, 5);
    expect(recencyWeight(180)).toBeCloseTo(0.25, 5);
  });

  it("lets confirmations bend a report's weight without erasing or doubling it", () => {
    expect(trustWeight(0)).toBe(1);
    expect(trustWeight(-99)).toBeGreaterThan(0.5);
    expect(trustWeight(99)).toBeLessThan(2);
  });

  it("bands on the share of people, not on how busy it is", () => {
    expect(bandFor(null)).toBe("no-signal");
    expect(bandFor(80)).toBe("worth-going");
    expect(bandFor(50)).toBe("mixed");
    expect(bandFor(10)).toBe("skip-it");
  });

  it("calls a report live only while the crowd reading is still current", () => {
    expect(freshnessFor(null)).toBe("cold");
    expect(freshnessFor(CROWD_FRESH_MIN)).toBe("live");
    expect(freshnessFor(CROWD_FRESH_MIN + 1)).toBe("recent");
    expect(freshnessFor(WINDOW_MIN + 1)).toBe("cold");
  });
});

describe("no reports", () => {
  it("has no score, no crowd, no queue and says nothing about the room", () => {
    const s = computeVibeScore([], NOW);
    expect(s.score).toBeNull();
    expect(s.band).toBe("no-signal");
    expect(s.contributors).toBe(0);
    expect(s.crowd).toBeNull();
    expect(s.queue).toBeNull();
    // The important one: absence of reports must never read as zero.
    expect(s.score).not.toBe(0);
  });
});

describe("expired reports", () => {
  it("ignores anything past the window entirely", () => {
    const s = computeVibeScore([report({ minutesAgo: WINDOW_MIN + 10 })], NOW);
    expect(s.score).toBeNull();
    expect(s.contributors).toBe(0);
  });

  it("ignores a report from the future rather than trusting a bad clock", () => {
    const s = computeVibeScore([report({ minutesAgo: -30 })], NOW);
    expect(s.score).toBeNull();
  });
});

describe("one report", () => {
  it("is usable but never confident", () => {
    const s = computeVibeScore([report({ minutesAgo: 10, worthIt: true })], NOW);
    expect(s.score).toBe(100);
    expect(s.contributors).toBe(1);
    expect(s.confident).toBe(false);
    expect(s.freshness).toBe("live");
  });
});

describe("distinct contributors", () => {
  it("counts people, not submissions", () => {
    const spammer = [
      report({ minutesAgo: 50, reporterId: "d_same", worthIt: true }),
      report({ minutesAgo: 40, reporterId: "d_same", worthIt: true }),
      report({ minutesAgo: 30, reporterId: "d_same", worthIt: true }),
      report({ minutesAgo: 20, reporterId: "d_same", worthIt: true }),
      report({ minutesAgo: 10, reporterId: "d_same", worthIt: true }),
    ];
    const s = computeVibeScore(spammer, NOW);
    expect(s.contributors).toBe(1);
    expect(s.confident).toBe(false);
  });

  it("cannot be pushed over the confidence floor by one person repeating", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      report({ minutesAgo: i + 1, reporterId: "d_same", worthIt: true })
    );
    expect(computeVibeScore(many, NOW).confident).toBe(false);
  });

  it("uses a contributor's newest report and drops their older one", () => {
    const s = computeVibeScore(
      [
        report({ minutesAgo: 120, reporterId: "d_changed", worthIt: true, crowd: 5 }),
        report({ minutesAgo: 5, reporterId: "d_changed", worthIt: false, crowd: 1 }),
      ],
      NOW
    );
    expect(s.contributors).toBe(1);
    expect(s.score).toBe(0); // the newer "no" replaced the older "yes"
    expect(s.crowd?.value).toBe(1);
  });

  it("reaches confidence with enough separate people", () => {
    const people = Array.from({ length: MIN_CONFIDENT_CONTRIBUTORS }, (_, i) =>
      report({ minutesAgo: 10, reporterId: `d_p${i}`, worthIt: true })
    );
    const s = computeVibeScore(people, NOW);
    expect(s.contributors).toBe(MIN_CONFIDENT_CONTRIBUTORS);
    expect(s.confident).toBe(true);
  });

  it("only counts a repeat contributor once in latestPerContributor", () => {
    const rows = latestPerContributor(
      [
        report({ minutesAgo: 30, reporterId: "d_a" }),
        report({ minutesAgo: 10, reporterId: "d_a" }),
        report({ minutesAgo: 20, reporterId: "d_b" }),
      ],
      NOW
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.report.reporterId === "d_a")?.age).toBe(10);
  });
});

describe("conflicting reports", () => {
  it("reports disagreement instead of hiding it in an average", () => {
    const s = computeVibeScore(
      [
        report({ minutesAgo: 5, reporterId: "d_1", worthIt: true }),
        report({ minutesAgo: 6, reporterId: "d_2", worthIt: true }),
        report({ minutesAgo: 7, reporterId: "d_3", worthIt: false }),
        report({ minutesAgo: 8, reporterId: "d_4", worthIt: false }),
      ],
      NOW
    );
    expect(s.split).toBe(true);
    expect(s.score).toBeGreaterThan(30);
    expect(s.score).toBeLessThan(70);
  });

  it("does not call a lone dissenter in a big group a split", () => {
    const rows = [
      ...Array.from({ length: 9 }, (_, i) =>
        report({ minutesAgo: 5, reporterId: `d_y${i}`, worthIt: true })
      ),
      report({ minutesAgo: 5, reporterId: "d_n", worthIt: false }),
    ];
    expect(computeVibeScore(rows, NOW).split).toBe(false);
  });
});

describe("separate freshness windows", () => {
  it("drops the crowd reading once it is older than the crowd window", () => {
    const s = computeVibeScore(
      [report({ minutesAgo: CROWD_FRESH_MIN + 5, crowd: 5 })],
      NOW
    );
    expect(s.score).not.toBeNull(); // still informs the recommendation
    expect(s.crowd).toBeNull(); // but is not a current crowd reading
  });

  it("drops the queue reading sooner than the crowd reading", () => {
    const s = computeVibeScore(
      [report({ minutesAgo: QUEUE_FRESH_MIN + 5, crowd: 4, line: "brutal" })],
      NOW
    );
    expect(s.crowd).not.toBeNull();
    expect(s.queue).toBeNull();
  });

  it("attaches the age and the people behind every reading it does show", () => {
    const s = computeVibeScore(
      [
        report({ minutesAgo: 5, reporterId: "d_1", crowd: 4, line: "long" }),
        report({ minutesAgo: 9, reporterId: "d_2", crowd: 5, line: "long" }),
      ],
      NOW
    );
    expect(s.crowd?.contributors).toBe(2);
    expect(s.crowd?.minutesSinceLast).toBe(5);
    expect(s.queue?.value).toBe("long");
    expect(s.lastReportAt).toBeTruthy();
  });

  it("keeps a cover reading for the full window because cover moves slowly", () => {
    const s = computeVibeScore([report({ minutesAgo: 200, cover: 20 })], NOW);
    expect(s.cover?.value).toBe(20);
    expect(s.queue).toBeNull();
  });
});

describe("crowd and recommendation stay separate", () => {
  it("can be packed and not worth going", () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      report({ minutesAgo: 5, reporterId: `d_${i}`, crowd: 5, worthIt: false })
    );
    const s = computeVibeScore(rows, NOW);
    expect(s.crowd?.value).toBe(5);
    expect(s.score).toBe(0);
    expect(s.band).toBe("skip-it");
  });
});

describe("non-independent reports", () => {
  it("keeps venue and team reports out of the public number", () => {
    const rows = [
      report({ minutesAgo: 5, reporterId: "d_pub", worthIt: false }),
      ...Array.from({ length: 5 }, (_, i) =>
        report({
          minutesAgo: 5,
          reporterId: `d_staff${i}`,
          worthIt: true,
          role: "venue" as ReporterRole,
        })
      ),
    ];
    const s = computeVibeScore(rows, NOW);
    expect(s.contributors).toBe(1);
    expect(s.score).toBe(0);
  });
});

describe("ranking", () => {
  it("does not let a tiny unanimous sample beat a well supported one", () => {
    const tiny = computeVibeScore(
      [
        report({ minutesAgo: 20, reporterId: "d_a", worthIt: true }),
        report({ minutesAgo: 20, reporterId: "d_b", worthIt: true }),
      ],
      NOW
    );
    const solid = computeVibeScore(
      Array.from({ length: 15 }, (_, i) =>
        report({ minutesAgo: 5, reporterId: `d_s${i}`, worthIt: i < 13 })
      ),
      NOW
    );
    expect(tiny.score).toBe(100);
    expect(solid.score).toBeLessThan(90);
    expect(rankValue(solid)).toBeGreaterThan(rankValue(tiny));
  });

  it("puts anything with a score above anything without one", () => {
    const none = computeVibeScore([], NOW);
    const weak = computeVibeScore([report({ minutesAgo: 300, worthIt: false })], NOW);
    expect(rankValue(weak)).toBeGreaterThan(rankValue(none));
  });
});

describe("ranking evidence gate", () => {
  it("refuses comparative claims with nothing behind them", () => {
    expect(hasRankingEvidence([])).toBe(false);
    expect(hasRankingEvidence([computeVibeScore([], NOW)])).toBe(false);
    // One live venue is not a ranking.
    expect(
      hasRankingEvidence([computeVibeScore([report({ minutesAgo: 5 })], NOW)])
    ).toBe(false);
  });

  it("allows them once two venues are live and one is confident", () => {
    const confident = computeVibeScore(
      Array.from({ length: 5 }, (_, i) => report({ minutesAgo: 5, reporterId: `d_c${i}` })),
      NOW
    );
    const other = computeVibeScore([report({ minutesAgo: 8, reporterId: "d_x" })], NOW);
    expect(hasRankingEvidence([confident, other])).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  HALF_LIFE_MIN,
  MIN_CONFIDENT_REPORTS,
  WINDOW_MIN,
  bandFor,
  computeVibeScore,
  freshnessFor,
  rankValue,
  recencyWeight,
  trustWeight,
} from "./score";
import type { CrowdLevel, CrowdReport, LineLength } from "./types";

const NOW = new Date("2026-09-19T23:30:00-04:00");

function report(overrides: Partial<CrowdReport> & { minutesAgo: number }): CrowdReport {
  const { minutesAgo, ...rest } = overrides;
  return {
    id: `r${Math.random()}`,
    venueId: "v1",
    reporterId: "d_test",
    createdAt: new Date(NOW.getTime() - minutesAgo * 60000).toISOString(),
    crowd: 3 as CrowdLevel,
    line: "none" as LineLength,
    cover: null,
    worthIt: true,
    tags: [],
    netConfirms: 0,
    ...rest,
  };
}

describe("recencyWeight", () => {
  it("is 1 for a report made right now", () => {
    expect(recencyWeight(0)).toBe(1);
  });

  it("halves at exactly one half-life", () => {
    expect(recencyWeight(HALF_LIFE_MIN)).toBeCloseTo(0.5, 10);
    expect(recencyWeight(HALF_LIFE_MIN * 2)).toBeCloseTo(0.25, 10);
  });

  it("never reaches zero inside the window", () => {
    expect(recencyWeight(WINDOW_MIN)).toBeGreaterThan(0);
  });
});

describe("trustWeight", () => {
  it("is neutral with no votes", () => {
    expect(trustWeight(0)).toBe(1);
  });

  it("cannot erase a report however many disputes it gets", () => {
    expect(trustWeight(-100)).toBeGreaterThan(0.5);
  });

  it("cannot let one popular report dominate", () => {
    expect(trustWeight(1000)).toBeLessThanOrEqual(1.6);
  });
});

describe("computeVibeScore", () => {
  it("returns no signal when there are no reports", () => {
    const s = computeVibeScore([], NOW);
    expect(s.score).toBeNull();
    expect(s.band).toBe("no-signal");
    expect(s.sampleSize).toBe(0);
  });

  it("is the share of people who said it's worth coming", () => {
    const reports = [
      report({ minutesAgo: 1, worthIt: true }),
      report({ minutesAgo: 1, worthIt: true }),
      report({ minutesAgo: 1, worthIt: true }),
      report({ minutesAgo: 1, worthIt: false }),
    ];
    expect(computeVibeScore(reports, NOW).score).toBe(75);
  });

  it("ignores reports older than the window", () => {
    const s = computeVibeScore([report({ minutesAgo: WINDOW_MIN + 30 })], NOW);
    expect(s.sampleSize).toBe(0);
    expect(s.score).toBeNull();
  });

  it("ignores reports dated in the future", () => {
    const s = computeVibeScore([report({ minutesAgo: -60 })], NOW);
    expect(s.sampleSize).toBe(0);
  });

  it("weights a fresh report above a stale one", () => {
    const s = computeVibeScore(
      [
        report({ minutesAgo: 5, worthIt: true }),
        report({ minutesAgo: 300, worthIt: false }),
      ],
      NOW
    );
    // Fresh "yes" carries far more weight than a five-hour-old "no".
    expect(s.score).toBeGreaterThan(90);
  });

  it("flags low sample sizes as unconfident", () => {
    const few = Array.from({ length: MIN_CONFIDENT_REPORTS - 1 }, () =>
      report({ minutesAgo: 10 })
    );
    expect(computeVibeScore(few, NOW).confident).toBe(false);

    const enough = Array.from({ length: MIN_CONFIDENT_REPORTS }, () =>
      report({ minutesAgo: 10 })
    );
    expect(computeVibeScore(enough, NOW).confident).toBe(true);
  });

  it("keeps crowd level independent of the score", () => {
    // Rammed, and everybody hates it.
    const s = computeVibeScore(
      Array.from({ length: 6 }, () => report({ minutesAgo: 5, crowd: 5, worthIt: false })),
      NOW
    );
    expect(s.score).toBe(0);
    expect(s.crowd).toBe(5);
  });

  it("takes the median line, not the worst one", () => {
    const s = computeVibeScore(
      [
        report({ minutesAgo: 5, line: "none" }),
        report({ minutesAgo: 5, line: "none" }),
        report({ minutesAgo: 5, line: "short" }),
        report({ minutesAgo: 5, line: "brutal" }),
      ],
      NOW
    );
    expect(s.line).not.toBe("brutal");
  });

  it("only surfaces tags a third of reporters mentioned", () => {
    const s = computeVibeScore(
      [
        report({ minutesAgo: 5, tags: ["good-music", "good-crowd"] }),
        report({ minutesAgo: 5, tags: ["good-music"] }),
        report({ minutesAgo: 5, tags: ["good-music"] }),
        report({ minutesAgo: 5, tags: ["overpriced"] }),
      ],
      NOW
    );
    expect(s.topTags).toContain("good-music");
    expect(s.topTags).not.toContain("overpriced");
  });

  it("reports the median observed cover, ignoring blanks", () => {
    const s = computeVibeScore(
      [
        report({ minutesAgo: 5, cover: 20 }),
        report({ minutesAgo: 5, cover: 20 }),
        report({ minutesAgo: 5, cover: null }),
      ],
      NOW
    );
    expect(s.cover).toBe(20);
  });
});

describe("bandFor", () => {
  it("maps the boundaries the UI promises", () => {
    expect(bandFor(100)).toBe("going-off");
    expect(bandFor(80)).toBe("going-off");
    expect(bandFor(79)).toBe("worth-it");
    expect(bandFor(60)).toBe("worth-it");
    expect(bandFor(59)).toBe("mixed");
    expect(bandFor(40)).toBe("mixed");
    expect(bandFor(39)).toBe("skip-it");
    expect(bandFor(0)).toBe("skip-it");
    expect(bandFor(null)).toBe("no-signal");
  });
});

describe("freshnessFor", () => {
  it("degrades through the states in order", () => {
    expect(freshnessFor(5)).toBe("live");
    expect(freshnessFor(45)).toBe("live");
    expect(freshnessFor(46)).toBe("recent");
    expect(freshnessFor(180)).toBe("recent");
    expect(freshnessFor(181)).toBe("earlier");
    expect(freshnessFor(WINDOW_MIN + 1)).toBe("cold");
    expect(freshnessFor(null)).toBe("cold");
  });
});

describe("rankValue", () => {
  it("does not let two enthusiastic people outrank a busy consensus", () => {
    const tinySample = computeVibeScore(
      [report({ minutesAgo: 20, worthIt: true }), report({ minutesAgo: 20, worthIt: true })],
      NOW
    );
    const bigSample = computeVibeScore(
      Array.from({ length: 15 }, (_, i) => report({ minutesAgo: 5, worthIt: i < 13 })),
      NOW
    );

    expect(tinySample.score).toBe(100);
    expect(bigSample.score).toBeLessThan(100);
    expect(rankValue(bigSample)).toBeGreaterThan(rankValue(tinySample));
  });

  it("puts venues with no signal last", () => {
    const none = computeVibeScore([], NOW);
    const bad = computeVibeScore(
      Array.from({ length: 5 }, () => report({ minutesAgo: 5, worthIt: false })),
      NOW
    );
    expect(rankValue(bad)).toBeGreaterThan(rankValue(none));
  });
});

import { describe, expect, it } from "vitest";
import {
  NIGHT_CUTOFF_HOUR,
  addDays,
  daysBetween,
  describeEventTiming,
  formatNightShort,
  formatOttawaClock,
  nightHeading,
  nightOf,
  nightTag,
  nightWindow,
  ottawaDate,
  ottawaInstant,
  ottawaParts,
  weekdayOf,
} from "./time";

/**
 * These tests exist because the deployed site got every one of them wrong.
 * They are written against fixed instants so they fail in CI on a UTC runner
 * exactly the way the site failed in production.
 */

describe("ottawaInstant", () => {
  it("resolves a summer wall-clock time at EDT (UTC-4)", () => {
    expect(ottawaInstant("2026-09-19", "22:30").toISOString()).toBe(
      "2026-09-20T02:30:00.000Z"
    );
  });

  it("resolves a winter wall-clock time at EST (UTC-5)", () => {
    expect(ottawaInstant("2026-01-15", "22:30").toISOString()).toBe(
      "2026-01-16T03:30:00.000Z"
    );
  });

  it("puts a doors-at-midnight event on the following calendar date", () => {
    // 00:30 on Sept 20 is half an hour after midnight, not the previous evening.
    expect(ottawaInstant("2026-09-20", "00:30").toISOString()).toBe(
      "2026-09-20T04:30:00.000Z"
    );
  });

  it("lands on a real instant for a wall time that DST skips", () => {
    // 2026-03-08 02:30 does not exist in Ottawa; clocks jump 02:00 -> 03:00.
    // A wall clock would read 03:30 EDT, which is 07:30 UTC.
    expect(ottawaInstant("2026-03-08", "02:30").toISOString()).toBe(
      "2026-03-08T07:30:00.000Z"
    );
  });

  it("takes the first occurrence of a wall time DST repeats", () => {
    // 2026-11-01 01:30 happens twice. The first is still EDT (UTC-4).
    expect(ottawaInstant("2026-11-01", "01:30").toISOString()).toBe(
      "2026-11-01T05:30:00.000Z"
    );
  });

  it("round-trips through ottawaDate", () => {
    expect(ottawaDate(ottawaInstant("2026-09-19", "23:59"))).toBe("2026-09-19");
    expect(ottawaDate(ottawaInstant("2026-09-20", "00:01"))).toBe("2026-09-20");
  });
});

describe("ottawaParts", () => {
  it("reads Ottawa wall-clock parts from a UTC instant", () => {
    const p = ottawaParts(new Date("2026-09-20T02:30:00.000Z"));
    expect(p).toMatchObject({ year: 2026, month: 9, day: 19, hour: 22, minute: 30 });
    expect(p.weekday).toBe(6); // Saturday Sept 19, 2026
  });

  it("does not roll the day over at 8pm the way the server timezone did", () => {
    // 2026-09-17T23:00-04:00 is 2026-09-18T03:00Z. The old code read the UTC
    // date here and called it Friday the 18th.
    const p = ottawaParts(new Date("2026-09-18T03:00:00.000Z"));
    expect(p.day).toBe(17);
    expect(p.weekday).toBe(4); // Thursday
  });
});

describe("nightOf", () => {
  it("keeps late evening on its own night", () => {
    expect(nightOf(new Date("2026-09-20T02:30:00.000Z"))).toBe("2026-09-19");
  });

  it("keeps the small hours on the previous night", () => {
    // 1:30am Sunday Sept 20 is still Saturday night.
    expect(nightOf(new Date("2026-09-20T05:30:00.000Z"))).toBe("2026-09-19");
  });

  it("starts a new night at the cutoff hour", () => {
    const justBefore = ottawaInstant("2026-09-20", "04:59");
    const justAfter = ottawaInstant("2026-09-20", `0${NIGHT_CUTOFF_HOUR}:00`);
    expect(nightOf(justBefore)).toBe("2026-09-19");
    expect(nightOf(justAfter)).toBe("2026-09-20");
  });

  it("handles the UTC-day-ahead case that broke the homepage", () => {
    // Thursday 11:35pm Ottawa. The server (UTC) already thought it was Friday.
    expect(nightOf(new Date("2026-09-18T03:35:00.000Z"))).toBe("2026-09-17");
  });
});

describe("nightWindow", () => {
  it("covers cutoff to cutoff and contains after-midnight events", () => {
    const { start, end } = nightWindow("2026-09-19");
    expect(start.toISOString()).toBe("2026-09-19T09:00:00.000Z"); // 5am EDT
    expect(end.toISOString()).toBe("2026-09-20T09:00:00.000Z");

    const lateSet = ottawaInstant("2026-09-20", "00:30");
    expect(lateSet >= start && lateSet < end).toBe(true);
  });

  it("is 23 hours long on the spring-forward night", () => {
    const { start, end } = nightWindow("2026-03-07");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });

  it("is 25 hours long on the fall-back night", () => {
    const { start, end } = nightWindow("2026-10-31");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });
});

describe("plain date arithmetic", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("counts whole days across a DST change", () => {
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(daysBetween("2026-09-19", "2026-09-17")).toBe(-2);
  });

  it("knows the weekday of a plain date", () => {
    expect(weekdayOf("2026-09-17")).toBe(4); // Thursday
    expect(weekdayOf("2026-09-19")).toBe(6); // Saturday
  });
});

describe("formatting", () => {
  it("prints Ottawa wall-clock time, not server time", () => {
    expect(formatOttawaClock("2026-09-20T02:30:00.000Z")).toBe("10:30pm");
    expect(formatOttawaClock("2026-09-20T00:00:00.000Z")).toBe("8pm");
    expect(formatOttawaClock("2026-09-20T04:30:00.000Z")).toBe("12:30am");
  });

  it("always shows the real date beside the relative word", () => {
    expect(formatNightShort("2026-09-19")).toBe("Sat 19 Sep");
    expect(nightHeading("2026-09-19", "2026-09-19")).toBe("Tonight");
    expect(nightHeading("2026-09-20", "2026-09-19")).toBe("Tomorrow");
    expect(nightHeading("2026-09-22", "2026-09-19")).toBe("Tue 22 Sep");
  });

  it("tags a future night as future even in a dense row", () => {
    expect(nightTag("2026-09-19", "2026-09-19")).toBe("Tonight");
    expect(nightTag("2026-09-20", "2026-09-19")).toBe("Tmrw");
    expect(nightTag("2026-09-25", "2026-09-19")).toBe("Fri");
  });

  it("never describes a next-day event without its date", () => {
    // The exact failure from the audit: Friday's event on Thursday's page.
    const friday10pm = ottawaInstant("2026-09-18", "22:00").toISOString();
    const text = describeEventTiming(friday10pm, "2026-09-17");
    expect(text).toBe("Tomorrow, Fri 18 Sep, 10pm");
    expect(text).not.toContain("Tonight");
  });
});

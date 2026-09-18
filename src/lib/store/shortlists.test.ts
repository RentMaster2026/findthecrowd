import { describe, expect, it } from "vitest";
import {
  SHORTLIST_TTL_HOURS,
  castShortlistVote,
  createShortlist,
  getExplore,
  getShortlistTally,
  newShortlistCode,
} from "./index";
import { VENUES } from "@/data/venues";

/**
 * Group shortlists.
 *
 * The rule that matters most is the last one: a group vote says where people
 * WANT to go. It is not evidence that anyone is in the room, so it must never
 * touch a crowd score. Everything else here is the bounded-utility contract:
 * unguessable code, one changeable vote per browser, validated input, a link
 * that expires rather than quietly presenting an old plan as tonight's.
 */

const A = VENUES[0].id;
const B = VENUES[1].id;
const C = VENUES[2].id;

describe("shortlist codes", () => {
  it("are long, unguessable and URL safe", () => {
    const code = newShortlistCode();
    expect(code).toMatch(/^[a-hjkmnp-z2-9]{20}$/);
  });

  it("do not repeat", () => {
    const codes = new Set(Array.from({ length: 500 }, () => newShortlistCode()));
    expect(codes.size).toBe(500);
  });
});

describe("creating and reading", () => {
  it("opens with the venues given, no votes and a bounded expiry", async () => {
    const now = new Date("2026-09-19T23:00:00.000Z");
    const list = await createShortlist([A, B, C], "Friday", now);
    const tally = await getShortlistTally(list.code, now);

    expect(tally).not.toBeNull();
    expect(tally?.shortlist.venueIds).toEqual([A, B, C]);
    expect(tally?.totalVotes).toBe(0);
    expect(tally?.expired).toBe(false);

    const hours =
      (new Date(list.expiresAt).getTime() - now.getTime()) / 3_600_000;
    expect(hours).toBe(SHORTLIST_TTL_HOURS);
  });

  it("is readable by a stranger with only the link", async () => {
    const list = await createShortlist([A, B], null);
    // No voter id, no account, no prior state: exactly a fresh anonymous visit.
    const tally = await getShortlistTally(list.code);
    expect(tally?.counts).toHaveLength(2);
  });

  it("returns nothing for a code that was never issued", async () => {
    expect(await getShortlistTally("aaaaaaaaaaaaaaaaaaaa")).toBeNull();
  });
});

describe("voting", () => {
  it("counts a vote", async () => {
    const list = await createShortlist([A, B], null);
    const tally = await castShortlistVote(list.code, "v_alice", A);
    expect(tally.totalVotes).toBe(1);
    expect(tally.counts.find((c) => c.venueId === A)?.votes).toBe(1);
  });

  it("replaces a voter's own vote instead of adding a second", async () => {
    const list = await createShortlist([A, B], null);
    await castShortlistVote(list.code, "v_bob", A);
    const tally = await castShortlistVote(list.code, "v_bob", B);

    expect(tally.totalVotes).toBe(1);
    expect(tally.counts.find((c) => c.venueId === A)?.votes).toBe(0);
    expect(tally.counts.find((c) => c.venueId === B)?.votes).toBe(1);
  });

  it("does not let one browser stuff the ballot by repeating", async () => {
    const list = await createShortlist([A, B], null);
    for (let i = 0; i < 10; i++) {
      await castShortlistVote(list.code, "v_repeat", A);
    }
    const tally = await getShortlistTally(list.code);
    expect(tally?.totalVotes).toBe(1);
  });

  it("counts different browsers separately", async () => {
    const list = await createShortlist([A, B], null);
    await castShortlistVote(list.code, "v_1", A);
    await castShortlistVote(list.code, "v_2", A);
    const tally = await castShortlistVote(list.code, "v_3", B);
    expect(tally.totalVotes).toBe(3);
    expect(tally.counts.find((c) => c.venueId === A)?.votes).toBe(2);
  });

  it("rejects a vote for something that is not on the ballot", async () => {
    const list = await createShortlist([A, B], null);
    await expect(castShortlistVote(list.code, "v_x", C)).rejects.toThrow(
      /not on this shortlist/
    );
  });

  it("rejects a vote on a link that does not exist", async () => {
    await expect(castShortlistVote("zzzzzzzzzzzzzzzzzzzz", "v_x", A)).rejects.toThrow(
      /does not exist/
    );
  });
});

describe("expiry", () => {
  it("marks the link expired rather than presenting an old plan as tonight's", async () => {
    const created = new Date("2026-09-19T23:00:00.000Z");
    const list = await createShortlist([A, B], null, created);
    await castShortlistVote(list.code, "v_1", A, created);

    const nextEvening = new Date(created.getTime() + 24 * 3_600_000);
    const tally = await getShortlistTally(list.code, nextEvening);
    expect(tally?.expired).toBe(true);
    // The votes are still readable, they are just labelled as last night's.
    expect(tally?.totalVotes).toBe(1);
  });

  it("accepts no further votes once expired", async () => {
    const created = new Date("2026-09-19T23:00:00.000Z");
    const list = await createShortlist([A, B], null, created);
    const nextEvening = new Date(created.getTime() + 24 * 3_600_000);
    await expect(castShortlistVote(list.code, "v_late", A, nextEvening)).rejects.toThrow(
      /expired/
    );
  });
});

describe("isolation from crowd data", () => {
  it("never lets a group vote change a venue's crowd figures", async () => {
    const now = new Date("2026-09-19T23:00:00.000Z");
    const before = await getExplore(now);
    const beforeRow = before.rows.find((r) => r.venue.id === A);

    const list = await createShortlist([A, B], null, now);
    for (let i = 0; i < 25; i++) {
      await castShortlistVote(list.code, `v_crowd${i}`, A, now);
    }

    const after = await getExplore(now);
    const afterRow = after.rows.find((r) => r.venue.id === A);

    expect(afterRow?.score.score).toBe(beforeRow?.score.score ?? null);
    expect(afterRow?.score.contributors).toBe(beforeRow?.score.contributors);
    expect(afterRow?.score.crowd?.value).toBe(beforeRow?.score.crowd?.value);
    expect(after.contributorsThisHour).toBe(before.contributorsThisHour);
  });
});

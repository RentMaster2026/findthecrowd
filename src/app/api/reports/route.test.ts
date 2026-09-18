import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { VENUES } from "@/data/venues";
import { REPORT_HOURLY_LIMIT } from "@/lib/store";

/**
 * The report endpoint is the boundary.
 *
 * The sheet in the browser is a convenience and can be bypassed with one curl
 * command, so everything the product promises about reporting has to hold here:
 * two answers are enough, everything else is optional, bad input is refused
 * with a sentence a human can act on, and the cooldown cannot be talked out of.
 */

let n = 0;
function reporterId(): string {
  n += 1;
  return `d_test${String(n).padStart(6, "0")}`;
}

function post(body: unknown): Request {
  return new Request("http://localhost/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VENUE = VENUES[0].id;

describe("the short path", () => {
  it("accepts a report with only the two required answers", async () => {
    const res = await POST(post({ venueId: VENUE, reporterId: reporterId(), crowd: 4, worthIt: true }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true });
  });

  it("accepts the optional details when they are supplied", async () => {
    const res = await POST(
      post({
        venueId: VENUE,
        reporterId: reporterId(),
        crowd: 2,
        worthIt: false,
        line: "long",
        cover: 20,
        tags: ["good-music", "slow-door"],
      })
    );
    expect(res.status).toBe(200);
  });
});

describe("validation", () => {
  it("refuses a body that is not JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/reports", { method: "POST", body: "not json" })
    );
    expect(res.status).toBe(400);
  });

  it("refuses an unknown venue", async () => {
    const res = await POST(post({ venueId: "v-nope", reporterId: reporterId(), crowd: 3, worthIt: true }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: expect.stringContaining("venue") });
  });

  it("refuses a malformed reporter id", async () => {
    const res = await POST(post({ venueId: VENUE, reporterId: "../../etc/passwd", crowd: 3, worthIt: true }));
    expect(res.status).toBe(400);
  });

  it("refuses a missing verdict", async () => {
    const res = await POST(post({ venueId: VENUE, reporterId: reporterId(), crowd: 3 }));
    expect(res.status).toBe(400);
  });

  it("refuses a missing or out of range crowd level", async () => {
    const missing = await POST(post({ venueId: VENUE, reporterId: reporterId(), worthIt: true }));
    expect(missing.status).toBe(400);

    const tooHigh = await POST(
      post({ venueId: VENUE, reporterId: reporterId(), crowd: 9, worthIt: true })
    );
    expect(tooHigh.status).toBe(400);
  });

  it("refuses an implausible cover charge", async () => {
    const res = await POST(
      post({ venueId: VENUE, reporterId: reporterId(), crowd: 3, worthIt: true, cover: 5000 })
    );
    expect(res.status).toBe(400);
  });

  it("silently drops tags outside the allowlist rather than failing the report", async () => {
    const res = await POST(
      post({
        venueId: VENUE,
        reporterId: reporterId(),
        crowd: 3,
        worthIt: true,
        tags: ["good-music", "<script>alert(1)</script>", "not-a-tag"],
      })
    );
    expect(res.status).toBe(200);
  });

  it("ignores a bogus queue value instead of storing it", async () => {
    const res = await POST(
      post({ venueId: VENUE, reporterId: reporterId(), crowd: 3, worthIt: true, line: "enormous" })
    );
    expect(res.status).toBe(200);
  });
});

describe("cooldown", () => {
  it("refuses a second report for the same venue from the same device", async () => {
    const id = reporterId();
    const first = await POST(post({ venueId: VENUE, reporterId: id, crowd: 3, worthIt: true }));
    expect(first.status).toBe(200);

    const second = await POST(post({ venueId: VENUE, reporterId: id, crowd: 5, worthIt: true }));
    expect(second.status).toBe(429);
    const body = await second.json();
    expect(body.error).toMatch(/already reported/i);
    // The message tells them when they can try again rather than just failing.
    expect(body.error).toMatch(/\d+ min/);
  });

  it("still allows that device to report a different venue", async () => {
    const id = reporterId();
    await POST(post({ venueId: VENUES[0].id, reporterId: id, crowd: 3, worthIt: true }));
    const other = await POST(post({ venueId: VENUES[1].id, reporterId: id, crowd: 3, worthIt: true }));
    expect(other.status).toBe(200);
  });

  it("stops one device blanketing the city", async () => {
    const id = reporterId();
    let lastStatus = 200;
    for (let i = 0; i < REPORT_HOURLY_LIMIT + 2 && i < VENUES.length; i++) {
      const res = await POST(post({ venueId: VENUES[i].id, reporterId: id, crowd: 3, worthIt: true }));
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});

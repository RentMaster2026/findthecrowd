import { describe, expect, it } from "vitest";
import { VENUES, VENUE_BY_SLUG } from "./venues";
import { GUIDES } from "./guides";
import { expandEvents } from "./events";
import { ALL_TAGS, TAG_LABEL, TAG_ORDER_FOOD, TAG_ORDER_NIGHTLIFE } from "@/lib/labels";

/**
 * Data guards.
 *
 * A guide that names a venue we do not have renders a gap where a card should
 * be, and nobody notices until a reader does. A duplicate slug silently breaks
 * a page. These are cheap to check and expensive to miss, so they run in CI.
 */

describe("venues", () => {
  it("has no duplicate slugs or ids", () => {
    const slugs = VENUES.map((v) => v.slug);
    const ids = VENUES.map((v) => v.id);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses URL safe slugs", () => {
    for (const v of VENUES) {
      expect(v.slug, v.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("puts every venue inside the Ottawa area", () => {
    for (const v of VENUES) {
      expect(v.lat, v.name).toBeGreaterThan(45.2);
      expect(v.lat, v.name).toBeLessThan(45.6);
      expect(v.lng, v.name).toBeGreaterThan(-76.0);
      expect(v.lng, v.name).toBeLessThan(-75.4);
    }
  });

  it("gives every venue an address and a blurb", () => {
    for (const v of VENUES) {
      expect(v.address.length, v.name).toBeGreaterThan(4);
      expect(v.blurb.length, v.name).toBeGreaterThan(10);
    }
  });

  it("never puts a cover charge on a restaurant", () => {
    for (const v of VENUES.filter((v) => v.kind === "restaurant")) {
      expect(v.typicalCover, v.name).toBeNull();
    }
  });
});

describe("guides", () => {
  it("has no duplicate slugs", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only names venues that exist", () => {
    for (const guide of GUIDES) {
      for (const section of guide.sections) {
        for (const entry of section.entries) {
          expect(
            VENUE_BY_SLUG.has(entry.venueSlug),
            `${guide.slug} references unknown venue "${entry.venueSlug}"`
          ).toBe(true);
        }
      }
    }
  });

  it("keeps meta descriptions inside what Google will show", () => {
    for (const guide of GUIDES) {
      expect(guide.description.length, guide.slug).toBeGreaterThan(70);
      expect(guide.description.length, guide.slug).toBeLessThanOrEqual(165);
    }
  });

  it("answers at least three questions on every guide", () => {
    for (const guide of GUIDES) {
      expect(guide.faq.length, guide.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("uses no dashes or bold markers in the copy", () => {
    const banned = /[–—]|\*\*/;
    for (const guide of GUIDES) {
      const text = [
        guide.title,
        guide.description,
        ...guide.intro,
        ...guide.sections.flatMap((s) => [s.heading, s.intro ?? "", ...s.entries.map((e) => e.note)]),
        ...guide.faq.flatMap((f) => [f.q, f.a]),
      ].join(" ");
      expect(banned.test(text), `${guide.slug} contains a dash or bold marker`).toBe(false);
    }
  });
});

describe("events", () => {
  it("never returns an event that already finished", () => {
    const now = new Date("2026-09-19T23:00:00-04:00");
    for (const e of expandEvents(now, 7)) {
      expect(new Date(e.endsAt ?? e.startsAt).getTime()).toBeGreaterThanOrEqual(now.getTime());
    }
  });

  it("attaches every event to a real venue and names a source", () => {
    const ids = new Set(VENUES.map((v) => v.id));
    for (const e of expandEvents(new Date(), 7)) {
      expect(ids.has(e.venueId), e.title).toBe(true);
      expect(e.source.length).toBeGreaterThan(2);
    }
  });
});

describe("tag vocabulary", () => {
  it("never offers a nightlife tag at a restaurant", () => {
    const nightlifeOnly = ["good-music", "bad-music", "dead-floor", "fast-door", "slow-door", "cheap-drinks"];
    for (const tag of TAG_ORDER_FOOD) {
      expect(nightlifeOnly).not.toContain(tag);
    }
  });

  it("never offers a food tag at a club", () => {
    const foodOnly = ["good-food", "slow-service", "worth-the-wait"];
    for (const tag of TAG_ORDER_NIGHTLIFE) {
      expect(foodOnly).not.toContain(tag);
    }
  });

  it("gives every tag a label", () => {
    for (const tag of ALL_TAGS) {
      expect(TAG_LABEL[tag], tag).toBeTruthy();
    }
  });
});

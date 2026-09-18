import type { OneOffDef, RecurringDef } from "./events";
import type { OpeningHours } from "@/lib/types";

/**
 * Unverified sample fixtures. Development and preview only.
 *
 * These are the weekly templates that used to ship as public listings. They are
 * kept — rather than deleted — for two reasons:
 *
 *   1. Several of them are probably true. "Blues night at the Rainbow Bistro"
 *      is the kind of thing a person who goes out in Ottawa knows. Preserving
 *      them means the operator verifies a known list against venue pages
 *      instead of rebuilding it from memory.
 *   2. A dev environment with an empty calendar makes it impossible to see
 *      whether the event surfaces work.
 *
 * They are marked `verified: false` at expansion time and the store only asks
 * for them when the demo dataset is in use, so they cannot reach a production
 * page. The placeholder source is deliberately unusable as evidence: it names
 * no URL a person could check, which is exactly what "unverified" means.
 *
 * ONE ENTRY WAS DELETED RATHER THAN DEMOTED. The old file generated a
 * "REDBLACKS home game" at TD Place every Saturday, sourced to "Team schedule".
 * The 2026 schedule has Ottawa away at Calgary on Sept 19 and a single home
 * date on Sept 26, and no team plays a home game every week. It is not a
 * candidate for verification, so it is gone. The real Sept 26 fixture lives in
 * VERIFIED_ONE_OFFS. See docs/DATA-CHANGES.md.
 *
 * "Game-day pre-drinks" at Glebe Central Pub was also removed: it existed only
 * as a satellite of that fabricated weekly home game.
 */

const UNVERIFIED: RecurringDef["source"] = {
  label: "Unverified sample listing",
  url: "",
  checkedAt: "",
};

const free = { kind: "free" } as const;
const cad = (n: number) => ({ kind: "amount", cad: n }) as const;

export const SAMPLE_RECURRING: RecurringDef[] = [
  { venueId: "v-berlin", title: "UNDERGROUND: resident house night", nightWeekday: 5, time: "22:30", durationHours: 4, category: "dj", price: cad(20), source: UNVERIFIED },
  { venueId: "v-berlin", title: "Saturday main room", nightWeekday: 6, time: "22:00", durationHours: 4, category: "dj", price: cad(25), source: UNVERIFIED },
  { venueId: "v-27club", title: "Local bands triple bill", nightWeekday: 4, time: "20:00", durationHours: 4, category: "live-band", price: cad(15), source: UNVERIFIED },
  { venueId: "v-27club", title: "Late DJ set", nightWeekday: 6, time: "23:00", durationHours: 3, category: "dj", price: cad(10), source: UNVERIFIED },
  { venueId: "v-lookout", title: "Karaoke night", nightWeekday: 3, time: "21:00", durationHours: 4, category: "community", price: free, source: UNVERIFIED },
  { venueId: "v-lookout", title: "Sunday karaoke", nightWeekday: 0, time: "21:00", durationHours: 4, category: "community", price: free, source: UNVERIFIED },
  { venueId: "v-palace", title: "Saturdays at The Palace", nightWeekday: 6, time: "22:30", durationHours: 4, category: "dj", price: cad(25), source: UNVERIFIED },
  { venueId: "v-the-show", title: "Friday main room", nightWeekday: 5, time: "22:00", durationHours: 4, category: "dj", price: cad(20), source: UNVERIFIED },
  { venueId: "v-room104", title: "Afrobeats & hip hop", nightWeekday: 5, time: "22:00", durationHours: 4, category: "dj", price: cad(10), source: UNVERIFIED },
  { venueId: "v-heart-crown", title: "Live trad session", nightWeekday: 4, time: "20:30", durationHours: 3, category: "live-band", price: free, source: UNVERIFIED },
  { venueId: "v-heart-crown", title: "Weekend house band", nightWeekday: 6, time: "21:00", durationHours: 4, category: "live-band", price: free, source: UNVERIFIED },
  { venueId: "v-rainbow", title: "Blues night", nightWeekday: 5, time: "21:00", durationHours: 3, category: "live-band", price: cad(15), source: UNVERIFIED },
  { venueId: "v-dominion", title: "Punk showcase", nightWeekday: 6, time: "21:00", durationHours: 4, category: "live-band", price: cad(12), source: UNVERIFIED },
  { venueId: "v-lowertown", title: "Patio sessions", nightWeekday: 4, time: "19:00", durationHours: 4, category: "live-band", price: free, source: UNVERIFIED },
  { venueId: "v-nuvo", title: "Caribbean Fridays", nightWeekday: 5, time: "22:00", durationHours: 4, category: "dj", price: cad(20), source: UNVERIFIED },
  { venueId: "v-happy-fish", title: "Elgin dance night", nightWeekday: 5, time: "22:00", durationHours: 4, category: "dj", price: cad(15), source: UNVERIFIED },
  { venueId: "v-live-on-elgin", title: "Indie double bill", nightWeekday: 4, time: "20:00", durationHours: 3, category: "live-band", price: cad(20), source: UNVERIFIED },
  { venueId: "v-live-on-elgin", title: "Stand-up showcase", nightWeekday: 2, time: "20:00", durationHours: 2, category: "comedy", price: cad(15), source: UNVERIFIED },
  { venueId: "v-the-standard", title: "Techno basement", nightWeekday: 6, time: "23:00", durationHours: 4, category: "dj", price: cad(10), source: UNVERIFIED },
  { venueId: "v-city-at-night", title: "Big room Saturdays", nightWeekday: 6, time: "22:30", durationHours: 4, category: "dj", price: cad(25), source: UNVERIFIED },
  { venueId: "v-gridwrks", title: "Warehouse night", nightWeekday: 5, time: "23:00", durationHours: 5, category: "dj", price: cad(20), source: UNVERIFIED },
  { venueId: "v-house-of-targ", title: "Perogies, pinball & punk", nightWeekday: 5, time: "20:30", durationHours: 4, category: "live-band", price: cad(15), source: UNVERIFIED },
  { venueId: "v-swizzles", title: "Drag revue", nightWeekday: 6, time: "21:30", durationHours: 3, category: "community", price: cad(10), source: UNVERIFIED },
  { venueId: "v-irenes", title: "Folk session", nightWeekday: 3, time: "20:00", durationHours: 3, category: "live-band", price: cad(10), source: UNVERIFIED },
  { venueId: "v-hintonburg-public-house", title: "Upstairs karaoke", nightWeekday: 5, time: "21:30", durationHours: 4, category: "community", price: free, source: UNVERIFIED },
  { venueId: "v-bronson-centre", title: "Touring headliner", nightWeekday: 4, time: "19:30", durationHours: 3, category: "live-band", price: cad(45), source: UNVERIFIED },
  { venueId: "v-copper", title: "Rooftop sunset DJ", nightWeekday: 4, time: "18:00", durationHours: 4, category: "dj", price: free, source: UNVERIFIED },

  /**
   * An after-midnight set, kept in the fixtures because it is the case the old
   * code could not express. It belongs to Saturday NIGHT but happens on
   * Sunday's calendar date, and the expansion has to put it on Saturday's list
   * while still printing Sunday's date on the card.
   */
  { venueId: "v-lieutenants-pump", title: "Upstairs after midnight", nightWeekday: 6, time: "00:30", durationHours: 3, category: "dj", price: free, source: UNVERIFIED },
];

/**
 * A cancelled fixture and a rescheduled one, so the dev preview exercises both
 * states. Dated relative to nothing: the operator replaces them.
 */
export const SAMPLE_ONE_OFFS: OneOffDef[] = [];

/**
 * Sample opening hours, dev only.
 *
 * Production ships with no verified hours for any venue, so every venue
 * honestly reports "hours unconfirmed". These fixtures exist so the open /
 * opens-later / closed code paths can be seen working in a preview. Collecting
 * real hours is a pilot task in docs/PILOT.md.
 */
const lateNight = (open: string, close: string) => ({ open, close });

export const SAMPLE_HOURS: Record<string, OpeningHours> = {
  "v-berlin": {
    week: [
      null, null, null,
      lateNight("22:00", "02:00"),
      lateNight("22:00", "02:00"),
      lateNight("22:00", "02:00"),
      lateNight("22:00", "02:00"),
    ],
    source: { label: "Sample fixture", url: "", checkedAt: "" },
  },
  "v-heart-crown": {
    week: [
      lateNight("11:00", "23:00"),
      lateNight("11:00", "23:00"),
      lateNight("11:00", "23:00"),
      lateNight("11:00", "02:00"),
      lateNight("11:00", "02:00"),
      lateNight("11:00", "02:00"),
      lateNight("11:00", "02:00"),
    ],
    source: { label: "Sample fixture", url: "", checkedAt: "" },
  },
};

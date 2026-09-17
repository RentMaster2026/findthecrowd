/**
 * Core domain types for Find the Crowd.
 *
 * Deliberately small. Every field here exists because a screen renders it or
 * the score engine consumes it. If you add a field, add the reason.
 */

export type District =
  | "byward"
  | "elgin"
  | "centretown"
  | "lansdowne"
  | "hintonburg"
  | "little-italy"
  | "sandy-hill"
  | "chinatown"
  | "wellington-west"
  | "westboro";

export type VenueKind =
  | "club"
  | "bar"
  | "pub"
  | "live-music"
  | "lounge"
  | "arena"
  | "hall"
  | "restaurant";

/**
 * Restaurants and bars need different words for the same questions. A queue is
 * a line at a club and a wait for a table at a restaurant, and a restaurant has
 * no cover charge. One flag, read in the report sheet and the venue page.
 */
export type VenueClass = "nightlife" | "food";

export interface Venue {
  id: string;
  slug: string;
  name: string;
  kind: VenueKind;
  district: District;
  address: string;
  /** [latitude, longitude] — WGS84. Seed values are approximate; see scripts/geocode.md */
  lat: number;
  lng: number;
  /** Short, factual. No marketing copy — this is a utility, not a listings site. */
  blurb: string;
  capacityBand: "small" | "medium" | "large";
  /** Typical door cover in CAD. null = no cover / varies by night. */
  typicalCover: number | null;
  agePolicy: "18+" | "19+" | "all-ages" | "varies";
}

/** How packed the room is. 1 = empty, 5 = shoulder to shoulder. */
export type CrowdLevel = 1 | 2 | 3 | 4 | 5;

/** Door line length at the moment of reporting. */
export type LineLength = "none" | "short" | "long" | "brutal";

/**
 * Preset observations. Fixed list, not free text — free text needs moderation
 * and slows reporting down. Waze works because reporting is three taps.
 */
export type VibeTag =
  | "good-music"
  | "bad-music"
  | "good-crowd"
  | "dead-floor"
  | "cheap-drinks"
  | "overpriced"
  | "fast-door"
  | "slow-door"
  | "good-staff"
  | "rough-night"
  // Food only. "Slow door" means nothing at a dining table.
  | "good-food"
  | "slow-service"
  | "worth-the-wait";

export interface CrowdReport {
  id: string;
  venueId: string;
  /** Anonymous, device-scoped. Never a real identity at MVP stage. */
  reporterId: string;
  createdAt: string; // ISO 8601
  crowd: CrowdLevel;
  line: LineLength;
  /** Observed cover in CAD. null = walked in free or didn't check. */
  cover: number | null;
  /**
   * The Vibe Score input. "Would you tell a friend to come here right now?"
   * This is the only field that feeds the headline number.
   */
  worthIt: boolean;
  tags: VibeTag[];
  /** Community confirmations minus disputes. Used as a trust weight. */
  netConfirms: number;
}

export type ScoreBand = "going-off" | "worth-it" | "mixed" | "skip-it" | "no-signal";
export type Freshness = "live" | "recent" | "earlier" | "cold";

export interface VibeScore {
  /** 0-100, percent of recency-weighted reports that said "worth it". */
  score: number | null;
  band: ScoreBand;
  /** Recency-weighted mean crowd level, 1-5. */
  crowd: number | null;
  line: LineLength | null;
  /** Median observed cover in the window, CAD. */
  cover: number | null;
  /** Raw count of reports inside the scoring window. */
  sampleSize: number;
  /** Below the confidence floor we show the number greyed out with a warning. */
  confident: boolean;
  freshness: Freshness;
  /** Minutes since the most recent report. null when there are none. */
  minutesSinceLast: number | null;
  /** Tags mentioned by at least a third of reporters, most common first. */
  topTags: VibeTag[];
}

export interface VenueEvent {
  id: string;
  venueId: string;
  title: string;
  /** ISO 8601 start time, local Ottawa time. */
  startsAt: string;
  endsAt: string | null;
  category: "dj" | "live-band" | "comedy" | "sports" | "market" | "festival" | "community";
  /** Door price in CAD. null = free. */
  price: number | null;
  ticketUrl: string | null;
  /** Where this listing came from. Shown on the card — attribution is not optional. */
  source: string;
}

export interface VenueWithScore {
  venue: Venue;
  score: VibeScore;
  nextEvent: VenueEvent | null;
}

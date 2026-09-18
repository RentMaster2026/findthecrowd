/**
 * Core domain types for Find the Crowd.
 *
 * Deliberately small. Every field here exists because a screen renders it or
 * the score engine consumes it. If you add a field, add the reason.
 */

import type { PlainDate } from "./time";

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

/**
 * Opening hours, as Ottawa wall-clock times per weekday.
 *
 * `null` for a day means closed. A close time earlier than the open time means
 * the venue closes after midnight, which is most of them.
 *
 * This exists because "open" was being inferred from an event title or a stale
 * report, which is how a listing tells someone to walk to a locked door. A
 * venue with no entry here is reported as "hours unconfirmed", never as open.
 */
export interface OpeningHours {
  /** Indexed 0 = Sunday .. 6 = Saturday. */
  week: ({ open: string; close: string } | null)[];
  /** Where these hours came from, so a wrong one can be traced and fixed. */
  source: SourceRef;
}

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
  /** Absent means hours are unconfirmed. It does not mean closed. */
  hours?: OpeningHours;
}

/** What we can honestly say about whether a venue's doors are open. */
export type OpenState =
  | { kind: "open"; closesAt: string }
  | { kind: "opens-later"; opensAt: string }
  | { kind: "closed-tonight" }
  | { kind: "unconfirmed" };

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

/**
 * Who filed a report.
 *
 * An independent public contributor is the default and the only kind that
 * feeds the public consensus. Anything else has to say so on the card: a
 * venue's own staff talking up their own room is not the same fact as a
 * stranger in the room, and mixing them silently would make the number a lie.
 */
export type ReporterRole = "public" | "team" | "venue";

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
   * The headline input. "Would you tell a friend to come here right now?"
   * This is the only field that feeds the "worth going" number.
   */
  worthIt: boolean;
  tags: VibeTag[];
  /** Community confirmations minus disputes. Used as a trust weight. */
  netConfirms: number;
  /** Defaults to "public". Non-public reports are labelled and excluded. */
  role?: ReporterRole;
}

export type ScoreBand = "worth-going" | "mixed" | "skip-it" | "no-signal";
export type Freshness = "live" | "recent" | "earlier" | "cold";

/**
 * A fact derived from reports, carrying the evidence that supports it.
 *
 * Nothing in the UI renders a derived number without also being able to say
 * how many people it came from and how old it is. Bundling them makes it
 * impossible to display one without the other by accident.
 */
export interface Observation<T> {
  value: T;
  /** Distinct contributors whose latest qualifying report supports this. */
  contributors: number;
  /** Minutes since the newest report behind this observation. */
  minutesSinceLast: number;
}

export interface VibeScore {
  /**
   * Percent of recent distinct contributors who said it is worth going.
   * This is a share of people, not an occupancy percentage.
   */
  score: number | null;
  band: ScoreBand;
  /** Distinct contributors inside the recommendation window. */
  contributors: number;
  /** Enough distinct contributors to present the number plainly. */
  confident: boolean;
  freshness: Freshness;
  /** Minutes since the most recent qualifying report. null when there are none. */
  minutesSinceLast: number | null;
  /**
   * ISO instant of the most recent qualifying report. Carried separately from
   * the minute count so a share message can print a real "as of" clock time
   * rather than a relative phrase that rots the moment it is forwarded.
   */
  lastReportAt: string | null;
  /** Crowd level 1-5. Present only while a report is inside the crowd window. */
  crowd: Observation<number> | null;
  /** Door queue. Present only inside the shorter queue window. */
  queue: Observation<LineLength> | null;
  /** Observed cover in CAD. Changes slowly, so it uses the full window. */
  cover: Observation<number> | null;
  /** Contributors are meaningfully split on whether it is worth going. */
  split: boolean;
  /** Tags mentioned by at least a third of contributors, most common first. */
  topTags: VibeTag[];
}

/* -------------------------------------------------------------- events ---- */

/**
 * Where a listing came from.
 *
 * `url` must point at the page that actually supports THIS event — a calendar
 * entry, a ticket page, a team schedule. A venue's homepage is not evidence
 * that a particular night is happening at a particular time for a particular
 * price, so a homepage-only source is recorded as unverified.
 */
export interface SourceRef {
  /** Human label shown on the card, e.g. "House of TARG events page". */
  label: string;
  /** The supporting page. Rendered as a real link. */
  url: string;
  /** ISO date a human last checked this against the source. */
  checkedAt: string;
}

/**
 * Door price. "Unknown" is a first-class answer.
 *
 * Substituting a plausible number for a price nobody checked is the same class
 * of error as inventing a crowd score, so there is no way to express "probably
 * about twenty dollars" in this type.
 */
export type EventPrice =
  | { kind: "free" }
  | { kind: "amount"; cad: number }
  | { kind: "unknown" };

export type EventStatus = "scheduled" | "cancelled";

export interface VenueEvent {
  id: string;
  venueId: string;
  title: string;
  /** ISO 8601 instant (UTC underneath). Never a naive local string. */
  startsAt: string;
  endsAt: string | null;
  /** The Ottawa night this belongs to. A 12:30am set belongs to the night before. */
  nightOf: PlainDate;
  category: "dj" | "live-band" | "comedy" | "sports" | "market" | "festival" | "community";
  price: EventPrice;
  ticketUrl: string | null;
  source: SourceRef;
  status: EventStatus;
  /**
   * True only when `source.url` is a page that supports this specific event.
   * Unverified events never render on a public surface.
   */
  verified: boolean;
  /** Set on a cancelled or rescheduled event so the card can explain itself. */
  note?: string;
}

export interface VenueWithScore {
  venue: Venue;
  score: VibeScore;
  /** The venue's next verified event on the night being viewed, if any. */
  nextEvent: VenueEvent | null;
  openState: OpenState;
}

/* ---------------------------------------------------------- shortlists ---- */

/**
 * A "pick with friends" shortlist. Small on purpose: a link, a few venues, one
 * vote each, an expiry. It is a utility for one night out, not a social graph.
 */
export interface Shortlist {
  /** Unguessable, URL-safe. This is the only credential the link carries. */
  code: string;
  venueIds: string[];
  createdAt: string;
  expiresAt: string;
  /** Optional free-text label the creator typed, e.g. "Sam's birthday". */
  title: string | null;
}

export interface ShortlistVote {
  code: string;
  /** Anonymous browser id. Limits casual duplicates. Not proof of a person. */
  voterId: string;
  venueId: string;
  createdAt: string;
}

export interface ShortlistTally {
  shortlist: Shortlist;
  counts: { venueId: string; votes: number }[];
  totalVotes: number;
  expired: boolean;
}

import { formatOttawaClock } from "./time";
import type {
  CrowdLevel,
  District,
  EventPrice,
  Freshness,
  LineLength,
  OpenState,
  ScoreBand,
  VenueClass,
  VenueKind,
  VibeTag,
} from "./types";

export function venueClass(kind: VenueKind): VenueClass {
  return kind === "restaurant" ? "food" : "nightlife";
}

/**
 * The same four queue states, said the way each kind of place says them.
 */
export const LINE_LABEL_FOOD: Record<LineLength, string> = {
  none: "Tables free",
  short: "Short wait",
  long: "Long wait",
  brutal: "Very long wait",
};

export function lineLabel(line: LineLength, kind: VenueKind): string {
  return venueClass(kind) === "food" ? LINE_LABEL_FOOD[line] : LINE_LABEL[line];
}

export function lineQuestion(kind: VenueKind): string {
  return venueClass(kind) === "food" ? "Wait for a table" : "Line at the door";
}

export const DISTRICT_LABEL: Record<District, string> = {
  byward: "ByWard Market",
  elgin: "Elgin Street",
  centretown: "Centretown",
  lansdowne: "Lansdowne",
  hintonburg: "Hintonburg",
  "little-italy": "Little Italy",
  "sandy-hill": "Sandy Hill",
  chinatown: "Chinatown",
  "wellington-west": "Wellington West",
  westboro: "Westboro",
};

export const KIND_LABEL: Record<VenueKind, string> = {
  club: "Nightclub",
  bar: "Bar",
  pub: "Pub",
  "live-music": "Live music",
  lounge: "Lounge",
  arena: "Arena",
  hall: "Music hall",
  restaurant: "Restaurant",
};

export const CROWD_LABEL: Record<CrowdLevel, string> = {
  1: "Empty",
  2: "Quiet",
  3: "Steady",
  4: "Busy",
  5: "Packed",
};

export const LINE_LABEL: Record<LineLength, string> = {
  none: "Walk right in",
  short: "Short line",
  long: "Long line",
  brutal: "Brutal line",
};

/**
 * The words under the number.
 *
 * "Worth going" rather than "Going off", because the number is the share of
 * people who said go — not how full the room is. The old "Going off" label read
 * as an occupancy claim sitting on top of a recommendation figure, which is
 * exactly the conflation the scoring engine goes out of its way to avoid.
 */
export const BAND_LABEL: Record<ScoreBand, string> = {
  "worth-going": "Worth going",
  mixed: "Mixed",
  "skip-it": "Skip it",
  "no-signal": "No reports yet",
};

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  live: "Reported in the last hour",
  recent: "Reported in the last few hours",
  earlier: "Reported earlier tonight",
  cold: "No recent reports",
};

/* ---------------------------------------------------------- open state ---- */

export function openLabel(state: OpenState): string {
  switch (state.kind) {
    case "open":
      return `Open until ${formatOttawaClock(state.closesAt)}`;
    case "opens-later":
      return `Opens ${formatOttawaClock(state.opensAt)}`;
    case "closed-tonight":
      return "Closed tonight";
    case "unconfirmed":
      return "Hours unconfirmed";
  }
}

/** Short form for a dense chip row. */
export function openLabelShort(state: OpenState): string {
  switch (state.kind) {
    case "open":
      return "Open";
    case "opens-later":
      return `Opens ${formatOttawaClock(state.opensAt)}`;
    case "closed-tonight":
      return "Closed";
    case "unconfirmed":
      return "Hours unknown";
  }
}

/* --------------------------------------------------------------- price ---- */

/**
 * An unknown price says so. It never becomes "Free", which is what a
 * `price: null` field quietly did before.
 */
export function priceLabel(price: EventPrice): string {
  switch (price.kind) {
    case "free":
      return "Free";
    case "amount":
      return `$${price.cad % 1 === 0 ? price.cad : price.cad.toFixed(2)}`;
    case "unknown":
      return "Price not checked";
  }
}

export const TAG_LABEL: Record<VibeTag, string> = {
  "good-music": "Music is good",
  "bad-music": "Music is off",
  "good-crowd": "Good crowd",
  "dead-floor": "Dead floor",
  "cheap-drinks": "Cheap drinks",
  overpriced: "Overpriced",
  "fast-door": "Fast door",
  "slow-door": "Slow door",
  "good-staff": "Staff are sound",
  "rough-night": "Rough night",
  "good-food": "Food is good",
  "slow-service": "Slow service",
  "worth-the-wait": "Worth the wait",
};

/**
 * Tags a reporter can pick, in the order they appear in the report sheet.
 * Good ones first, because most reports are positive and the common case
 * should need the least scrolling.
 */
export const TAG_ORDER_NIGHTLIFE: VibeTag[] = [
  "good-music",
  "good-crowd",
  "cheap-drinks",
  "fast-door",
  "good-staff",
  "bad-music",
  "dead-floor",
  "overpriced",
  "slow-door",
  "rough-night",
];

export const TAG_ORDER_FOOD: VibeTag[] = [
  "good-food",
  "good-crowd",
  "good-staff",
  "worth-the-wait",
  "overpriced",
  "slow-service",
];

export function tagOrder(kind: VenueKind): VibeTag[] {
  return venueClass(kind) === "food" ? TAG_ORDER_FOOD : TAG_ORDER_NIGHTLIFE;
}

/** Every tag any venue could carry. Used by the API allowlist. */
export const ALL_TAGS: VibeTag[] = [
  ...new Set([...TAG_ORDER_NIGHTLIFE, ...TAG_ORDER_FOOD]),
];

export function relativeTime(minutes: number | null): string {
  if (minutes === null) return "no data";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function formatCover(cover: number | null): string {
  if (cover === null) return "No cover";
  if (cover === 0) return "Free";
  return `$${cover} cover`;
}

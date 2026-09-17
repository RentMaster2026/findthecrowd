import type { VenueEvent } from "@/lib/types";

/**
 * Event supply for the Ottawa MVP.
 *
 * Real Find the Crowd pulls these from venue submissions, Eventbrite/Ticketmaster feeds
 * and manual research. For the MVP they are weekly recurring templates expanded
 * against the current date, so the feed is never empty while supply is being
 * built. Every card carries its `source` — attribution is shown in the UI, not
 * buried. Swap `expandEvents` for a real feed reader and nothing else changes.
 */

interface EventTemplate {
  venueId: string;
  title: string;
  /** 0 = Sunday .. 6 = Saturday */
  day: number;
  /** 24h local start time, "HH:MM" */
  time: string;
  durationHours: number;
  category: VenueEvent["category"];
  price: number | null;
  source: string;
}

const TEMPLATES: EventTemplate[] = [
  { venueId: "v-berlin", title: "UNDERGROUND: resident house night", day: 5, time: "22:30", durationHours: 4, category: "dj", price: 20, source: "Venue listing" },
  { venueId: "v-berlin", title: "Saturday main room", day: 6, time: "22:00", durationHours: 4, category: "dj", price: 25, source: "Venue listing" },
  { venueId: "v-27club", title: "Local bands triple bill", day: 4, time: "20:00", durationHours: 4, category: "live-band", price: 15, source: "Venue listing" },
  { venueId: "v-27club", title: "Late DJ set", day: 6, time: "23:00", durationHours: 3, category: "dj", price: 10, source: "Venue listing" },
  { venueId: "v-lookout", title: "Karaoke night", day: 3, time: "21:00", durationHours: 4, category: "community", price: null, source: "Venue listing" },
  { venueId: "v-lookout", title: "Sunday karaoke", day: 0, time: "21:00", durationHours: 4, category: "community", price: null, source: "Venue listing" },
  { venueId: "v-palace", title: "Saturdays at The Palace", day: 6, time: "22:30", durationHours: 4, category: "dj", price: 25, source: "Venue listing" },
  { venueId: "v-the-show", title: "Friday main room", day: 5, time: "22:00", durationHours: 4, category: "dj", price: 20, source: "Venue listing" },
  { venueId: "v-room104", title: "Afrobeats & hip hop", day: 5, time: "22:00", durationHours: 4, category: "dj", price: 10, source: "Venue listing" },
  { venueId: "v-heart-crown", title: "Live trad session", day: 4, time: "20:30", durationHours: 3, category: "live-band", price: null, source: "Venue listing" },
  { venueId: "v-heart-crown", title: "Weekend house band", day: 6, time: "21:00", durationHours: 4, category: "live-band", price: null, source: "Venue listing" },
  { venueId: "v-rainbow", title: "Blues night", day: 5, time: "21:00", durationHours: 3, category: "live-band", price: 15, source: "Venue listing" },
  { venueId: "v-dominion", title: "Punk showcase", day: 6, time: "21:00", durationHours: 4, category: "live-band", price: 12, source: "Venue listing" },
  { venueId: "v-lowertown", title: "Patio sessions", day: 4, time: "19:00", durationHours: 4, category: "live-band", price: null, source: "Venue listing" },
  { venueId: "v-nuvo", title: "Caribbean Fridays", day: 5, time: "22:00", durationHours: 4, category: "dj", price: 20, source: "Venue listing" },
  { venueId: "v-happy-fish", title: "Elgin dance night", day: 5, time: "22:00", durationHours: 4, category: "dj", price: 15, source: "Venue listing" },
  { venueId: "v-live-on-elgin", title: "Indie double bill", day: 4, time: "20:00", durationHours: 3, category: "live-band", price: 20, source: "Venue listing" },
  { venueId: "v-live-on-elgin", title: "Stand-up showcase", day: 2, time: "20:00", durationHours: 2, category: "comedy", price: 15, source: "Venue listing" },
  { venueId: "v-lieutenants-pump", title: "Upstairs after midnight", day: 6, time: "23:30", durationHours: 3, category: "dj", price: null, source: "Venue listing" },
  { venueId: "v-the-standard", title: "Techno basement", day: 6, time: "23:00", durationHours: 4, category: "dj", price: 10, source: "Venue listing" },
  { venueId: "v-city-at-night", title: "Big room Saturdays", day: 6, time: "22:30", durationHours: 4, category: "dj", price: 25, source: "Venue listing" },
  { venueId: "v-gridwrks", title: "Warehouse night", day: 5, time: "23:00", durationHours: 5, category: "dj", price: 20, source: "Venue listing" },
  { venueId: "v-house-of-targ", title: "Perogies, pinball & punk", day: 5, time: "20:30", durationHours: 4, category: "live-band", price: 15, source: "Venue listing" },
  { venueId: "v-swizzles", title: "Drag revue", day: 6, time: "21:30", durationHours: 3, category: "community", price: 10, source: "Venue listing" },
  { venueId: "v-irenes", title: "Folk session", day: 3, time: "20:00", durationHours: 3, category: "live-band", price: 10, source: "Venue listing" },
  { venueId: "v-td-place", title: "REDBLACKS home game", day: 6, time: "19:00", durationHours: 3, category: "sports", price: 35, source: "Team schedule" },
  { venueId: "v-glebe-central", title: "Game-day pre-drinks", day: 6, time: "16:30", durationHours: 3, category: "community", price: null, source: "Venue listing" },
  { venueId: "v-hintonburg-public-house", title: "Upstairs karaoke", day: 5, time: "21:30", durationHours: 4, category: "community", price: null, source: "Venue listing" },
  { venueId: "v-bronson-centre", title: "Touring headliner", day: 4, time: "19:30", durationHours: 3, category: "live-band", price: 45, source: "Ticket partner" },
  { venueId: "v-copper", title: "Rooftop sunset DJ", day: 4, time: "18:00", durationHours: 4, category: "dj", price: null, source: "Venue listing" },
];

function atLocalTime(date: Date, time: string, addHours = 0): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h + addHours, m, 0, 0);
  return d;
}

/**
 * Expand the weekly templates into concrete events for the next `days` days.
 * Deterministic for a given `now`, so server and client render the same list.
 */
export function expandEvents(now: Date = new Date(), days = 7): VenueEvent[] {
  const out: VenueEvent[] = [];
  for (let offset = 0; offset < days; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const dow = day.getDay();
    for (const t of TEMPLATES) {
      if (t.day !== dow) continue;
      const startsAt = atLocalTime(day, t.time);
      const endsAt = atLocalTime(day, t.time, t.durationHours);
      // Drop anything that already finished.
      if (endsAt < now) continue;
      out.push({
        id: `${t.venueId}-${startsAt.toISOString().slice(0, 10)}-${t.time}`,
        venueId: t.venueId,
        title: t.title,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        category: t.category,
        price: t.price,
        ticketUrl: null,
        source: t.source,
      });
    }
  }
  return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

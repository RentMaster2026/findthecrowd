import type { MetadataRoute } from "next";
import { VENUES } from "@/data/venues";
import { GUIDES } from "@/data/guides";
import { canonical } from "@/lib/seo";

/**
 * Next builds this into /sitemap.xml. Submit that URL once in Google Search
 * Console and every venue and guide page gets crawled without waiting for
 * Google to find them by following links.
 *
 * Priorities are honest: the guides are what people search for, the feed is
 * what they come back to, individual venue pages are the long tail.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: canonical("/"), lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: canonical("/guides"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: canonical("/events"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: canonical("/report"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: canonical("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },

    ...GUIDES.map((guide) => ({
      url: canonical(`/guides/${guide.slug}`),
      lastModified: new Date(guide.updated),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),

    ...VENUES.map((venue) => ({
      url: canonical(`/v/${venue.slug}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}

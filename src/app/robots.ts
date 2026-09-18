import type { MetadataRoute } from "next";
import { SITE_URL, canonical } from "@/lib/seo";

/**
 * Allow everything except the API and private group shortlists.
 *
 * A /g/ link is something one person sent to four friends. It should never turn
 * up in a search result, so it is disallowed here, excluded from the sitemap,
 * and the page itself also sends `noindex` — belt and braces, because a robots
 * rule is a request and a meta tag is the one crawlers actually honour for a
 * URL they already know about.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/g/"] }],
    sitemap: canonical("/sitemap.xml"),
    host: SITE_URL,
  };
}

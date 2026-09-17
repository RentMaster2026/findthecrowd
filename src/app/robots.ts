import type { MetadataRoute } from "next";
import { SITE_URL, canonical } from "@/lib/seo";

/**
 * Allow everything except the API. There is nothing private here and the whole
 * point of the guide pages is to be crawled.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: canonical("/sitemap.xml"),
    host: SITE_URL,
  };
}

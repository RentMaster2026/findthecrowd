import type { Metadata } from "next";
import type { Guide } from "@/data/guides";
import type { Venue, VibeScore } from "./types";
import { DISTRICT_LABEL, KIND_LABEL, venueClass } from "./labels";

/**
 * Search is the cheapest channel this product has.
 *
 * Nobody searches "Find the Crowd". They search "bars in ottawa tonight" and
 * "where to go out in ottawa". The guide pages are written for those searches,
 * and everything here exists so Google can read them properly: one canonical
 * URL per page, a real title and description on every route, Open Graph tags so
 * a link pasted into a group chat looks like something, and structured data so
 * venue pages can win the rich result.
 *
 * SITE_URL has to be the real domain in production. Set NEXT_PUBLIC_SITE_URL in
 * Vercel. Getting this wrong means every canonical tag points at localhost,
 * which is the single most common way a new site fails to get indexed.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://findthecrowd.com"
).replace(/\/$/, "");

export const SITE_NAME = "Find the Crowd";
export const SITE_TAGLINE = "What is actually good in Ottawa tonight";

export function canonical(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Every page goes through this, so no route can ship without a description. */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  const url = canonical(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_CA",
      type,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/* ------------------------------------------------------------ structured --- */

/**
 * Structured data tells Google what a page is rather than making it guess.
 * A venue page marked up as a BarOrNightClub with an aggregateRating can win a
 * rich result, which is worth more than any amount of keyword fiddling.
 */
export function venueJsonLd(venue: Venue, score: VibeScore) {
  const food = venueClass(venue.kind) === "food";
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": food ? "Restaurant" : venue.kind === "club" ? "NightClub" : "BarOrPub",
    name: venue.name,
    description: venue.blurb,
    url: canonical(`/v/${venue.slug}`),
    address: {
      "@type": "PostalAddress",
      streetAddress: venue.address,
      addressLocality: "Ottawa",
      addressRegion: "ON",
      addressCountry: "CA",
    },
    geo: { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng },
    areaServed: DISTRICT_LABEL[venue.district],
  };

  // Only claim a rating when there is a defensible one behind it. Marking up a
  // score built from two reports is the kind of thing that gets a site a manual
  // penalty, and it would deserve it. `contributors` rather than a raw
  // submission count, so the ratingCount is a number of people.
  if (score.score !== null && score.confident) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: score.score,
      bestRating: 100,
      worstRating: 0,
      ratingCount: score.contributors,
      reviewCount: score.contributors,
    };
  }

  return base;
}

export function guideJsonLd(guide: Guide) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      url: canonical(`/guides/${guide.slug}`),
      datePublished: guide.updated,
      dateModified: guide.updated,
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      about: { "@type": "City", name: "Ottawa", address: { "@type": "PostalAddress", addressRegion: "ON", addressCountry: "CA" } },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: guide.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    inLanguage: "en-CA",
  };
}

/** Venue kind phrased the way a search result should read. */
export function venueKindPhrase(venue: Venue): string {
  return `${KIND_LABEL[venue.kind]} in ${DISTRICT_LABEL[venue.district]}, Ottawa`;
}

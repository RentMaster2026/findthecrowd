import type { Metadata, Viewport } from "next";
import { Rail, TabBar } from "@/components/Nav";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL, organizationJsonLd } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Find the Crowd. What is actually good in Ottawa tonight",
    // Every page supplies its own title and this appends the brand.
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Live crowd reports from people already out in Ottawa. See how busy every bar, club and restaurant is right now, and whether it is worth the trip.",
  applicationName: SITE_NAME,
  keywords: [
    "Ottawa nightlife",
    "bars in Ottawa",
    "Ottawa clubs",
    "what to do in Ottawa tonight",
    "ByWard Market bars",
    "Elgin Street bars",
    "best restaurants Ottawa",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  // Pinch zoom stays available. Locking it out is an accessibility failure and
  // it is not what makes an app feel smooth.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>
        <JsonLd data={organizationJsonLd()} />
        <Rail />
        <div className="app">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}

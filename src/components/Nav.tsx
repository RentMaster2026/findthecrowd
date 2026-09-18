"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Three destinations, two arrangements.
 *
 * Explore, Saved, Update. That is the whole product: find somewhere, keep a
 * couple of options, tell everyone what it is like when you get there. The
 * fourth and fifth tabs this used to have (Events, Guides) were not
 * destinations, they were content — Events is a view inside Explore now, and
 * Guides moved to secondary navigation with its URLs untouched.
 *
 * On a phone it is a bottom tab bar, because that is where thumbs are. On a
 * desktop it is a left rail, because a bottom bar on a 27 inch monitor looks
 * like a phone app someone stretched. Same links, same active state, one
 * component, so they cannot drift apart.
 */

const PRIMARY = [
  { href: "/", label: "Explore", icon: CompassIcon },
  { href: "/saved", label: "Saved", icon: BookmarkIcon },
  { href: "/report", label: "Update", icon: PlusIcon },
] as const;

/** Still linked, still indexed, just not competing with the main job. */
const SECONDARY = [
  { href: "/events", label: "All events" },
  { href: "/?kind=restaurant", label: "Restaurants" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "How the score works" },
] as const;

function useActive(href: string) {
  const pathname = usePathname();
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function NavItem({
  href,
  label,
  Icon,
  className,
}: {
  href: string;
  label: string;
  Icon: () => React.ReactElement;
  className: string;
}) {
  const active = useActive(href);
  return (
    <Link
      href={href}
      className={className}
      data-active={active}
      aria-current={active ? "page" : undefined}
      prefetch
    >
      <Icon />
      {label}
    </Link>
  );
}

/** Phone: fixed bottom bar. Hidden above 900px by CSS. */
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {PRIMARY.map(({ href, label, icon }) => (
        <NavItem key={href} href={href} label={label} Icon={icon} className="tab" />
      ))}
    </nav>
  );
}

/** Phone: secondary links at the end of the page, not in the tab bar. */
export function SecondaryNav() {
  return (
    <nav className="secondary-nav" aria-label="More">
      {SECONDARY.map(({ href, label }) => (
        <Link key={href} href={href} className="secondary-link">
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Desktop: fixed left rail. Hidden below 900px by CSS. */
export function Rail() {
  return (
    <nav className="rail" aria-label="Main">
      <Link href="/" className="rail-brand">
        <span className="dot" aria-hidden="true" />
        <span>
          Find the <span className="brand-accent">Crowd</span>
        </span>
      </Link>

      {PRIMARY.map(({ href, label, icon }) => (
        <NavItem key={href} href={href} label={label} Icon={icon} className="rail-link" />
      ))}

      <div className="rail-secondary">
        {SECONDARY.map(({ href, label }) => (
          <Link key={href} href={href} className="rail-sub">
            {label}
          </Link>
        ))}
      </div>

      <div className="rail-foot">Ottawa. Built by people who go out here.</div>
    </nav>
  );
}

/* Icons are inline and drawn on a 24px grid. No icon font, no extra request,
   no flash of missing glyphs on a slow connection. */

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

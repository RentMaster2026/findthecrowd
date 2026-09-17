"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * One set of destinations, two arrangements.
 *
 * On a phone it is a bottom tab bar, because that is where thumbs are. On a
 * desktop it is a left rail, because a bottom bar on a 27 inch monitor looks
 * like a phone app someone stretched. Same links, same active state, one
 * component, so they cannot drift apart.
 */

const LINKS = [
  { href: "/", label: "Tonight", icon: FlameIcon },
  { href: "/events", label: "Events", icon: CalendarIcon },
  { href: "/guides", label: "Guides", icon: BookIcon },
  { href: "/report", label: "Report", icon: PlusIcon },
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
      // Prefetching the four main routes makes every tab switch instant on a
      // phone, which is most of what "feels fast" actually means.
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
      {LINKS.map(({ href, label, icon }) => (
        <NavItem key={href} href={href} label={label} Icon={icon} className="tab" />
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
          Find the <span style={{ color: "var(--hot)" }}>Crowd</span>
        </span>
      </Link>

      {LINKS.map(({ href, label, icon }) => (
        <NavItem key={href} href={href} label={label} Icon={icon} className="rail-link" />
      ))}

      <div className="rail-foot">
        Ottawa. Built by people who go out here.
        <br />
        <Link href="/about" style={{ textDecoration: "underline" }}>
          How the score works
        </Link>
      </div>
    </nav>
  );
}

/* Icons are inline and drawn on a 24px grid. No icon font, no extra request,
   no flash of missing glyphs on a slow connection. */

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 3c0 3-4 4-4 8a4 4 0 0 0 8 0c0-1.5-.7-2.6-1.5-3.5.3 1.4-.4 2.3-1 2.3-1.2 0-1.5-1.4-1.5-3 0-1.7.7-3 0-3.8Z" />
      <path d="M12 21a7 7 0 0 1-7-7c0-5 5-6.5 7-11 2 4.5 7 6 7 11a7 7 0 0 1-7 7Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M4 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H4Z" />
      <path d="M20 4h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H20Z" />
    </svg>
  );
}

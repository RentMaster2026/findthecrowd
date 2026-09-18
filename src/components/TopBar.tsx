import Link from "next/link";

/**
 * The header. Compact wordmark, the city, and the city's live state.
 *
 * The count says CONTRIBUTORS, not reports, because that is the number that
 * means something: five updates from one person is one person. It is also the
 * most honest indicator of whether the product is working tonight, so it stays
 * on screen even when it reads zero.
 */
export function TopBar({ contributorsThisHour }: { contributorsThisHour?: number }) {
  return (
    <header className="topbar">
      <Link href="/" className="wordmark">
        <span className="dot" aria-hidden="true" />
        <span>
          Find the <span className="brand-accent">Crowd</span>
        </span>
      </Link>
      <div className="topbar-meta">
        <span className="topbar-city">Ottawa</span>
        {contributorsThisHour !== undefined && (
          <span className="topbar-count">
            {contributorsThisHour === 0
              ? "no updates this hour"
              : `${contributorsThisHour} ${
                  contributorsThisHour === 1 ? "person" : "people"
                } reported this hour`}
          </span>
        )}
      </div>
    </header>
  );
}

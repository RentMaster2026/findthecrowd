/**
 * Route level loading state.
 *
 * The feed is server rendered on every request, so there is a moment between
 * tapping a tab and the data arriving. Showing the shape of what is coming
 * makes that moment feel like the app working rather than the app hanging, and
 * because the skeletons are the same height as real cards, nothing jumps when
 * the content lands.
 */
export default function Loading() {
  return (
    <>
      <header className="topbar">
        <div className="wordmark">
          <span className="dot" aria-hidden="true" />
          <span>
            Find the <span style={{ color: "var(--hot)" }}>Crowd</span>
          </span>
        </div>
      </header>

      <div className="page" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading</span>
        <div className="feed">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="skeleton" key={i}>
              <div className="skeleton-line" style={{ width: "58%", height: 16 }} />
              <div className="skeleton-line" style={{ width: "38%" }} />
              <div className="skeleton-line" style={{ width: "72%", marginTop: 16 }} />
              <div className="skeleton-line" style={{ width: "45%" }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

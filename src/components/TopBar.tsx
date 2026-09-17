/**
 * The header. Wordmark on the left, the city's live state on the right —
 * the count of reports in the last hour is the single most honest indicator
 * of whether this product is working tonight.
 */
export function TopBar({ liveReports }: { liveReports?: number }) {
  return (
    <header className="topbar">
      <div className="wordmark">
        <span className="dot" aria-hidden="true" />
        <span>
          Find the <span style={{ color: "var(--hot)" }}>Crowd</span>
        </span>
      </div>
      <div className="topbar-meta">
        <div>Ottawa</div>
        {liveReports !== undefined && (
          <div>
            {liveReports} {liveReports === 1 ? "report" : "reports"} this hour
          </div>
        )}
      </div>
    </header>
  );
}

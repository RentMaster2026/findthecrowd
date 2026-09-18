import { BAND_LABEL, CROWD_LABEL, relativeTime } from "@/lib/labels";
import { MIN_CONFIDENT_CONTRIBUTORS } from "@/lib/score";
import type { CrowdLevel, ScoreBand, VibeScore } from "@/lib/types";

export const BAND_COLOR: Record<ScoreBand, string> = {
  "worth-going": "var(--band-worth-going)",
  mixed: "var(--band-mixed)",
  "skip-it": "var(--band-skip-it)",
  "no-signal": "var(--band-no-signal)",
};

/**
 * The recommendation figure. One number, one phrase underneath.
 *
 * Two rules it exists to hold:
 *
 *   - It renders NOTHING when there is no evidence. The old version drew a "?"
 *     tile with a zero-width bar on every venue, which put 41 grey unknowns on
 *     the homepage and made the whole product look like a broken dashboard.
 *     Absence of reports is not a score, so it does not get a score tile; the
 *     card says what it knows in words instead.
 *   - The phrase underneath is not decoration. "Worth going" carries the
 *     meaning for anyone who cannot separate the colours, and it stops "62"
 *     being read as a star rating or as how full the room is.
 */
export function Score({ score, size = "sm" }: { score: VibeScore; size?: "sm" | "lg" }) {
  if (score.score === null) return null;

  const filled = score.confident && score.band === "worth-going";
  const label = score.confident ? BAND_LABEL[score.band] : "Low signal";

  const classes = ["score"];
  if (size === "lg") classes.push("score-big");
  if (filled) classes.push("score-filled");

  return (
    <div
      className={classes.join(" ")}
      data-band={score.band}
      data-unconfident={!score.confident}
    >
      <div className="score-num" style={filled ? undefined : { color: BAND_COLOR[score.band] }}>
        {score.score}
        <sup>%</sup>
      </div>
      <div className="score-band">{label}</div>
      <div className="sr-only">
        {score.score}% of {score.contributors}{" "}
        {score.contributors === 1 ? "person" : "people"} who reported in the last few hours said
        it is worth going. This is a share of people, not how full the room is.
      </div>
    </div>
  );
}

/**
 * Five bars, the reported level lit. Separate from the recommendation on
 * purpose: packed and good are different facts, and a busy room people are not
 * enjoying is a real and common thing.
 *
 * Renders only when the crowd reading is inside the crowd freshness window, so
 * a three-hour-old reading can never look like the state of the room now.
 */
export function CrowdMeter({ level }: { level: number | null }) {
  const lit = level === null ? 0 : Math.round(level);
  return (
    <span className="meter" role="img" aria-label={`Crowd level ${lit} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} data-on={i <= lit} />
      ))}
    </span>
  );
}

/**
 * The sentence that says how much evidence is behind the number.
 *
 * Every screen showing a score also shows this. A percentage with no sample
 * size and no age beside it is the single easiest way for this product to
 * mislead someone, so the two travel together.
 */
export function evidenceSentence(score: VibeScore): string {
  if (score.score === null) return "No reports in the last six hours.";

  const people = `${score.contributors} ${score.contributors === 1 ? "person" : "people"}`;
  const when = relativeTime(score.minutesSinceLast);
  const base = `${score.score}% of ${people} said it's worth going. Last update ${when}.`;

  if (score.contributors === 1) {
    return `One person said it's ${score.score === 100 ? "worth going" : "not worth it"} ${when}. That's one report, not a consensus.`;
  }
  if (!score.confident) {
    return `${base} Under ${MIN_CONFIDENT_CONTRIBUTORS} people, so treat it as a hint.`;
  }
  if (score.split) {
    return `${base} People disagree about this one.`;
  }
  return base;
}

/** Crowd, stated only when it is current, with its own age attached. */
export function crowdSentence(score: VibeScore): string | null {
  if (!score.crowd) return null;
  const label = CROWD_LABEL[Math.round(score.crowd.value) as CrowdLevel];
  return `${label} ${relativeTime(score.crowd.minutesSinceLast)}`;
}

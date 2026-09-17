import { BAND_LABEL } from "@/lib/labels";
import type { ScoreBand, VibeScore } from "@/lib/types";

export const BAND_COLOR: Record<ScoreBand, string> = {
  "going-off": "var(--band-going-off)",
  "worth-it": "var(--band-worth-it)",
  mixed: "var(--band-mixed)",
  "skip-it": "var(--band-skip-it)",
  "no-signal": "var(--band-no-signal)",
};

/**
 * The Vibe Score. One number, one word underneath.
 *
 * Above 60 the block fills with solid colour and the number goes dark, so a
 * place worth walking to is a colour you can see from across the screen rather
 * than a number you have to read. Below 60 the block stays flat and quiet.
 * That contrast is the whole point: the feed should look like a street where
 * two places have their lights on.
 *
 * The word underneath is not decoration. It carries the meaning for anyone who
 * cannot separate the colours, and it stops "62" reading as a star rating.
 */
export function Score({
  score,
  size = "sm",
}: {
  score: VibeScore;
  size?: "sm" | "lg";
}) {
  const filled = score.score !== null && score.confident && score.score >= 60;
  const label = score.confident || score.score === null ? BAND_LABEL[score.band] : "Low signal";

  const classes = ["score"];
  if (size === "lg") classes.push("score-big");
  if (filled) classes.push("score-filled");

  return (
    <div
      className={classes.join(" ")}
      data-band={score.band}
      data-unconfident={score.score !== null && !score.confident}
    >
      <div className="score-num" style={filled ? undefined : { color: BAND_COLOR[score.band] }}>
        {score.score === null ? "?" : score.score}
        {score.score !== null && <sup>%</sup>}
      </div>
      <div className="score-band">{label}</div>
      {!filled && (
        <div className="score-bar" aria-hidden="true">
          <span style={{ width: `${score.score ?? 0}%`, background: BAND_COLOR[score.band] }} />
        </div>
      )}
    </div>
  );
}

/** Five bars, the number lit. Separate from the score on purpose. */
export function CrowdMeter({ crowd }: { crowd: number | null }) {
  const lit = crowd === null ? 0 : Math.round(crowd);
  return (
    <span className="meter" role="img" aria-label={`Crowd level ${lit} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} data-on={i <= lit} />
      ))}
    </span>
  );
}

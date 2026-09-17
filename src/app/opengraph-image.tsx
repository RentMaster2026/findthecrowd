import { ImageResponse } from "next/og";

/**
 * The picture that shows up when someone pastes a link into a group chat.
 *
 * That is the main way this product will actually spread, so it is worth the
 * few lines. Built from the same colours as the app, generated at request time,
 * no image file to keep in sync.
 */
export const alt = "Find the Crowd. What is actually good in Ottawa tonight";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0b",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 28, height: 28, background: "#ff3b14" }} />
          {/* Satori needs an explicit display on any element with more than one
              child, so the two coloured words are separate flex items. */}
          <div
            style={{
              display: "flex",
              gap: 12,
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            <span style={{ color: "#f4f3f1" }}>Find the</span>
            <span style={{ color: "#ff3b14" }}>Crowd</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              color: "#f4f3f1",
              letterSpacing: -3,
              lineHeight: 1.05,
            }}
          >
            What is actually good in Ottawa tonight
          </div>
          <div style={{ fontSize: 32, color: "#a8a8b0" }}>
            Live crowd reports from people already out
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {[
            { n: "92", c: "#ff3b14" },
            { n: "71", c: "#ffb020" },
            { n: "48", c: "#8a8a93" },
            { n: "23", c: "#4e7286" },
          ].map((b) => (
            <div
              key={b.n}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 96,
                height: 96,
                background: b.c,
                color: "#0a0a0b",
                fontSize: 42,
                fontWeight: 800,
              }}
            >
              {b.n}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}

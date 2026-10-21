import { ImageResponse } from "next/og";

export const alt = "Alan is available for work";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// White card, one line in the bottom-left corner. Uses next/og's bundled
// Geist, so there's no font file to load.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          padding: 80,
          background: "#ffffff",
          color: "#171717",
          fontSize: 64,
          letterSpacing: "-0.03em",
        }}
      >
        Alan is available for work
      </div>
    ),
    size,
  );
}

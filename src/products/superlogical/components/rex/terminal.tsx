// A fixed character grid: every row is one --rex-line tall, so content can be
// positioned by (row, column) exactly like the terminal it replicates.

export type Seg = { t: string; c?: string; b?: boolean; u?: boolean; cursor?: boolean };
export type Row = Seg[];

/** Segment helper: s("text", "--t-blue", { b: true }) */
export const s = (t: string, c?: string, o: { b?: boolean; u?: boolean } = {}): Seg => ({ t, c, ...o });

/** The text cursor: one cell, drawn over whatever character it sits on. */
export const cursor = (t = " "): Seg => ({ t, cursor: true });

export function Terminal({
  rows,
  top,
  left,
  focused = true,
  className = "",
}: {
  rows: Row[];
  /** y of the first row's top edge, pane-relative (px) */
  top: number;
  /** x of column 0, pane-relative (px) */
  left: number;
  /** a focused terminal has a solid blinking cursor, an unfocused one a hollow box */
  focused?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rex-mono absolute ${className}`}
      style={{ top, left }}
      aria-hidden
    >
      {rows.map((row, i) => (
        <div key={i} style={{ height: "var(--rex-line)" }}>
          {row.map((seg, j) =>
            seg.cursor ? (
              <span key={j} className={focused ? "rex-cursor" : "rex-cursor-idle"}>
                {seg.t}
              </span>
            ) : (
              <span
                key={j}
                style={{
                  color: seg.c ? `var(${seg.c})` : undefined,
                  fontWeight: seg.b ? 700 : undefined,
                  textDecoration: seg.u ? "underline" : undefined,
                  textUnderlineOffset: seg.u ? "2.5px" : undefined,
                }}
              >
                {seg.t}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
}

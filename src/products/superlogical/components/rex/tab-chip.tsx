import type { ProgramKind } from "./model";
import { PROGRAMS } from "./programs";

// Rex's tab icon: the focused pane's program on a front card, with a card
// for each other pane in the tab stacked behind it, peeking out to the right;
// the stack is tilted 4°. Geometry measured on the 2x reference, in points,
// relative to the chip's top-left.
const FRONT = { x: 3.6, y: 6.6, w: 19.6, h: 16.4, r: 4.2 };
const BACK = [
  { right: 29.2, y: 7.6, h: 14.4 },
  { right: 34.2, y: 8.4, h: 12.8 },
];

function Card({
  style,
  children,
}: {
  style: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <span
      className="absolute grid place-items-center overflow-hidden"
      style={{
        borderRadius: FRONT.r,
        boxShadow: "var(--rex-chip-ring)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Where a tab's title starts, relative to the tab: wider stacks push it right. */
export const TITLE_OFFSET = [38.5, 43, 51];

export function TabChip({
  left,
  top,
  front,
  back,
}: {
  left: number;
  top: number;
  front: ProgramKind;
  /** the tab's other panes, nearest card first (at most two are drawn) */
  back: ProgramKind[];
}) {
  return (
    <span aria-hidden className="absolute block h-[28px] w-[37px] -rotate-[4deg]" style={{ left, top }}>
      {back
        .slice(0, 2)
        .map((kind, i) => ({ kind, ...BACK[i] }))
        .reverse()
        .map(({ kind, right, y, h }, i) => (
          <Card
            key={i}
            style={{ left: right - FRONT.w, top: y, width: FRONT.w, height: h, background: PROGRAMS[kind].back }}
          />
        ))}
      <Card style={{ left: FRONT.x, top: FRONT.y, width: FRONT.w, height: FRONT.h, background: PROGRAMS[front].front }}>
        {PROGRAMS[front].logo}
      </Card>
    </span>
  );
}

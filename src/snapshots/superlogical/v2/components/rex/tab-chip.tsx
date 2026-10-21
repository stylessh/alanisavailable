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

/**
 * The card's face: Rex's cards are lit from above like small glossy tiles,
 * brighter along the top and shading toward the bottom, with a light rim
 * just inside the edge (measured on the reference: the dark shell card reads
 * ~120 under its top edge against ~45 below).
 */
export const cardFace = (background: string): React.CSSProperties => ({
  background: `linear-gradient(to bottom, rgb(255 255 255 / 0.34), rgb(255 255 255 / 0.08) 40%, rgb(255 255 255 / 0) 60%, rgb(0 0 0 / 0.1)), ${background}`,
  boxShadow:
    "var(--rex-chip-ring), inset 0 0.5px 0 rgb(255 255 255 / 0.6), inset 0 0 0 0.75px rgb(255 255 255 / 0.22), inset 0 0 0 1.5px rgb(0 0 0 / 0.05)",
});

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
        ...style,
        ...cardFace(String(style.background)),
      }}
    >
      {children}
    </span>
  );
}

/**
 * The same stack in a row of text (the sidebar): it takes the space its
 * cards cover, so the text after it starts where the stack ends.
 */
export function ChipStack({ front, back }: { front: ProgramKind; back: ProgramKind[] }) {
  const n = Math.min(back.length, BACK.length);
  const width = n ? BACK[n - 1].right - FRONT.x : FRONT.w;
  return (
    <span aria-hidden className="relative block shrink-0 transition-[width] duration-200" style={{ width, height: FRONT.h }}>
      <TabChip left={-FRONT.x} top={-FRONT.y} front={front} back={back} />
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

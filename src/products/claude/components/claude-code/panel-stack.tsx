"use client";

import { type ComponentType, useRef, useState } from "react";
import { PANEL_EDGE, PANEL_SHARE, type PanelKind } from "./side-panel";

// The open side panels, stacked the way Claude's are: the first fills a
// column at the pane's right, the next opens under it, and a third starts a
// second column to the right, which the fourth stacks into. Opening a fifth
// lets go of the oldest. Every gap is a handle: the stack's left edge sets
// how much of the pane the panels take, the gap between columns trades width
// between them, and the gap between two stacked panels trades height.
//
// Each panel is laid out on its own (not nested in its column), so one that
// moves to another column or slot keeps its state. Panels appear, move and go
// at once, with no animation, and follow a dragged handle the same way.

/** columns hold this many panels */
const PER_COLUMN = 2;
const MAX_COLUMNS = 2;
export const MAX_PANELS = PER_COLUMN * MAX_COLUMNS;
/** the narrowest a column gets, the shortest a stacked panel gets, and what the conversation always keeps (pt) */
const MIN_COLUMN = 260;
const MIN_PANEL_H = 120;
export const MIN_TRANSCRIPT = 320;
/** a column after the first opens at this share of the pane */
const NEXT_SHARE = 0.32;

type Rect = { left: number; top: number; width: number; height: number };

/** the pill a handle shows: its thickness and length (pt) */
const PILL_W = 4;
const PILL_L = 56;

/** The open panels in columns, oldest first. */
const columnsOf = (open: readonly PanelKind[]) =>
  Array.from({ length: Math.ceil(open.length / PER_COLUMN) }, (_, i) => open.slice(i * PER_COLUMN, (i + 1) * PER_COLUMN));

/**
 * Columns that want more than `room` give it up together, in proportion, but
 * none below the narrowest a column gets: the wider ones make up the rest.
 */
function fit(cols: number[], room: number) {
  const wanted = cols.reduce((a, b) => a + b, 0);
  if (wanted <= room || !cols.length) return cols;
  if (room <= MIN_COLUMN * cols.length) return cols.map(() => room / cols.length);
  const scaled = cols.map((w) => (w * room) / wanted);
  const short = scaled.reduce((n, w) => n + Math.max(0, MIN_COLUMN - w), 0);
  const spare = scaled.reduce((n, w) => n + Math.max(0, w - MIN_COLUMN), 0);
  return scaled.map((w) => (w < MIN_COLUMN ? MIN_COLUMN : w - ((w - MIN_COLUMN) / spare) * short));
}

/**
 * Where everything goes in a pane `paneW` × `paneH`: each column's width
 * (what was dragged, else its default, shrunk together when the pane can't
 * fit them), and the width of the whole stack.
 */
export function usePanelLayout(open: readonly PanelKind[], paneW: number, paneH: number) {
  // what the handles set: columns' widths (pt) and stacked panels' splits (the top one's share)
  const [widths, setWidths] = useState<number[]>([]);
  const [splits, setSplits] = useState<number[]>([]);
  const columns = columnsOf(open);
  // Panels open beside the conversation, leaving it room. Dragged wider than that, they float
  // over it, as far as the whole pane; the conversation stays put at its narrowest under them.
  const gaps = PANEL_EDGE * (columns.length + 1);
  const resized = widths.some((w) => w !== undefined);
  const room = Math.max(0, paneW - gaps - (resized ? PANEL_EDGE : MIN_TRANSCRIPT));
  const cols = fit(
    columns.map((c, i) => widths[i] ?? Math.round(paneW * (i === 0 ? PANEL_SHARE[c[0]] : NEXT_SHARE))),
    room,
  );
  const total = cols.reduce((a, b) => a + b, 0) + PANEL_EDGE * Math.max(0, columns.length - 1);
  // what the conversation gives up to the panels: all they take, until it's down to its narrowest
  const beside = Math.max(0, paneW - MIN_TRANSCRIPT);
  const reserved = Math.min(total + PANEL_EDGE, beside);
  const floating = columns.length > 0 && total + PANEL_EDGE > beside;
  const areaH = Math.max(0, paneH - 2 * PANEL_EDGE);

  const rects: Partial<Record<PanelKind, Rect>> = {};
  let x = 0;
  columns.forEach((col, i) => {
    const split = splits[i] ?? 0.5;
    const topH = col.length > 1 ? Math.round(split * (areaH - PANEL_EDGE)) : areaH;
    col.forEach((kind, j) => {
      rects[kind] = j === 0 ? { left: x, top: 0, width: cols[i], height: topH } : { left: x, top: topH + PANEL_EDGE, width: cols[i], height: areaH - topH - PANEL_EDGE };
    });
    x += cols[i] + PANEL_EDGE;
  });

  return { columns, cols, splits, total, areaH, rects, setWidths, setSplits, paneW, reserved, floating };
}

type Layout = ReturnType<typeof usePanelLayout>;

/** A gap that drags: a gray pill shows in it while it's pointed at, a shade darker while it's held. */
function Handle({
  axis,
  style,
  label,
  onStart,
  onDrag,
}: {
  axis: "x" | "y";
  style: React.CSSProperties;
  label: string;
  onStart: () => void;
  /** how far the pointer has moved since the press, in the pane's own points */
  onDrag: (delta: number) => void;
}) {
  const from = useRef<{ at: number; scale: number } | null>(null);
  const [held, setHeld] = useState(false);
  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label={label}
      className="group absolute z-30 flex items-center justify-center"
      style={{ ...style, cursor: axis === "x" ? "col-resize" : "row-resize", touchAction: "none" }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        // the window may be drawn scaled: pointer distances are turned back into its points
        const box = e.currentTarget.parentElement!;
        const scale = box.getBoundingClientRect().width / box.offsetWidth || 1;
        from.current = { at: axis === "x" ? e.clientX : e.clientY, scale };
        setHeld(true);
        onStart();
      }}
      onPointerMove={(e) => {
        const f = from.current;
        if (f) onDrag(((axis === "x" ? e.clientX : e.clientY) - f.at) / f.scale);
      }}
      // the drag ends where the pointer lifts, whatever the last move was
      onPointerUp={(e) => {
        const f = from.current;
        if (f) onDrag(((axis === "x" ? e.clientX : e.clientY) - f.at) / f.scale);
        from.current = null;
        setHeld(false);
      }}
      onPointerCancel={() => {
        from.current = null;
        setHeld(false);
      }}
    >
      <span
        aria-hidden
        className={`flex-none rounded-full transition-[opacity,background-color] duration-150 ${held ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={{
          background: held ? "var(--cc-text-faint)" : "var(--cc-ring-track)",
          ...(axis === "x" ? { width: PILL_W, height: `min(${PILL_L}px, 40%)` } : { height: PILL_W, width: `min(${PILL_L}px, 40%)` }),
        }}
      />
    </div>
  );
}

type PanelProps = { expanded: boolean; onExpand: () => void; onClose: () => void };

export function PanelStack({
  open,
  layout,
  panels,
  expanded,
  onExpand,
  onClose,
}: {
  open: readonly PanelKind[];
  layout: Layout;
  panels: Record<PanelKind, ComponentType<PanelProps>>;
  expanded: PanelKind | null;
  onExpand: (kind: PanelKind) => void;
  onClose: (kind: PanelKind) => void;
}) {
  const { columns, cols, splits, total, areaH, rects, setWidths, setSplits, paneW, floating } = layout;
  // the sizes when a handle was pressed: a drag is measured from them
  const start = useRef({ cols, splits });
  const begin = () => {
    start.current = { cols, splits };
  };
  // the panels can be dragged out over the conversation, as far as the whole pane
  const maxStack = paneW - 2 * PANEL_EDGE;
  // an expanded panel covers the whole pane, the stack staying where it is under it
  const full: Rect = { left: total - (paneW - 2 * PANEL_EDGE), top: 0, width: paneW - 2 * PANEL_EDGE, height: areaH };

  return (
    <div className="pointer-events-none absolute z-20" style={{ top: PANEL_EDGE, right: PANEL_EDGE, bottom: PANEL_EDGE, width: total }}>
      {open.map((kind) => {
        const Panel = panels[kind];
        const r = kind === expanded ? full : rects[kind]!;
        return (
          <div key={kind} className="pointer-events-auto absolute" style={{ ...r, zIndex: kind === expanded ? 2 : 1 }}>
            {/* over the conversation, they lift off it: the shadow eases in as they cross into it (dragged that
                wide, or expanded over the whole pane), and out as they leave */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[12px] transition-opacity duration-200 ease-out"
              style={{ boxShadow: "var(--cc-surface-shadow)", opacity: floating || kind === expanded ? 1 : 0 }}
            />
            <Panel expanded={kind === expanded} onExpand={() => onExpand(kind)} onClose={() => onClose(kind)} />
          </div>
        );
      })}

      {!expanded && columns.length > 0 && (
        <>
          {/* the stack's left edge: wider panels, a narrower conversation (then panels over it) */}
          <Handle
            axis="x"
            label="Resize panels"
            style={{ left: -PANEL_EDGE, top: 0, bottom: 0, width: PANEL_EDGE, pointerEvents: "auto" }}
            onStart={begin}
            onDrag={(d) => {
              const [first, ...rest] = start.current.cols;
              const others = rest.reduce((a, b) => a + b, 0) + PANEL_EDGE * rest.length;
              const w = Math.min(maxStack - others, Math.max(MIN_COLUMN, first - d));
              setWidths([w, ...rest]);
            }}
          />
          {/* between two columns: one's width is the other's */}
          {columns.slice(1).map((_, k) => {
            const i = k + 1;
            const x = cols.slice(0, i).reduce((a, b) => a + b, 0) + PANEL_EDGE * (i - 1);
            return (
              <Handle
                key={`col-${i}`}
                axis="x"
                label="Resize columns"
                style={{ left: x, top: 0, bottom: 0, width: PANEL_EDGE, pointerEvents: "auto" }}
                onStart={begin}
                onDrag={(d) => {
                  const w = [...start.current.cols];
                  const pair = w[i - 1] + w[i];
                  w[i - 1] = Math.min(pair - MIN_COLUMN, Math.max(MIN_COLUMN, start.current.cols[i - 1] + d));
                  w[i] = pair - w[i - 1];
                  setWidths(w);
                }}
              />
            );
          })}
          {/* between two stacked panels: one's height is the other's */}
          {columns.map((col, i) => {
            if (col.length < 2) return null;
            const top = rects[col[0]]!;
            return (
              <Handle
                key={`row-${i}`}
                axis="y"
                label="Resize stacked panels"
                style={{ left: top.left, width: top.width, top: top.height, height: PANEL_EDGE, pointerEvents: "auto" }}
                onStart={begin}
                onDrag={(d) => {
                  const space = areaH - PANEL_EDGE;
                  const was = (start.current.splits[i] ?? 0.5) * space;
                  const h = Math.min(space - MIN_PANEL_H, Math.max(MIN_PANEL_H, was + d));
                  const next = [...start.current.splits];
                  next[i] = h / space;
                  setSplits(next);
                }}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

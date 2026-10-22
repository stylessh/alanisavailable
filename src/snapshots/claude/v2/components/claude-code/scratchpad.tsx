"use client";

import { AnimatePresence, motion, type MotionValue, useTransform } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icon";

// What the scratchpad puts on a picture: notes, pen strokes and boxes.
//
// Notes: clicking the picture with Write drops a numbered dot there and opens
// a note beside it to type into; Enter keeps it and folds it back into its
// dot. Clicking a dot opens its note to read, with an edit button to change
// it. One note is open at a time: clicking the picture while one is open
// closes it, except a new note with nothing in it yet, which moves to where
// you clicked instead.
//
// Marks: Draw follows the pointer for a freehand stroke; Box drags out a
// rectangle from corner to corner. Both draw in the picked ink.
//
// Everything keeps where it was made as fractions of the picture's width and
// height, so it stays bound to that spot of that image whatever size it's
// shown at (and whichever image of several it is). The layer sits inside the
// picture's own frame and moves and scales with it: marks are part of the
// picture and scale with it, while dots and notes are drawn back at their
// real size, so they read the same at any zoom.

/** A note pinned to a picture: where (x and y as fractions of its width and height, from its top-left corner), what it says and its ink. */
export type ImageNote = { id: string; x: number; y: number; text: string; ink: string };

/** A mark drawn on a picture, in the same fractions: a freehand stroke through `points`, or a box from its top-left corner. */
export type ImageMark =
  | { id: string; kind: "pen"; ink: string; points: [number, number][] }
  | { id: string; kind: "box"; ink: string; x: number; y: number; w: number; h: number };

/** Everything the scratchpad put on one picture. */
export type ImageScratch = { notes: ImageNote[]; marks: ImageMark[] };

export const EMPTY_SCRATCH: ImageScratch = { notes: [], marks: [] };

export type ScratchTool = "text" | "pen" | "square";

/** The note that's open: to read, or to write in. */
export type OpenNote = { id: string; edit: boolean } | null;

/** Ids for everything placed, unique across viewers (saved notes outlive the viewer they were made in). */
let placed = 0;
export const scratchId = (kind: string) => `${kind}-${++placed}`;

const DOT = 20;
/** the note's gap from its dot (pt), its widest, and its padding and line height: its first line sits level with the dot */
const NOTE_GAP = 10;
const NOTE_W = 248;
const PAD_X = 12;
const PAD_Y = 10;
const LINE = 18;
/** past this share of the width, a note opens to the left of its dot so it stays on the picture */
const FLIP_AT = 0.62;
/** inks light enough to want a dark number */
export const LIGHT_INKS = new Set(["#ebeae6", "#4ade80"]);
/** marks, in the picture's own points (they scale with it): line width, box corners */
const STROKE = 3;
const BOX_RADIUS = 4;
/** a stroke takes a new point once the pointer has moved this far on screen (px); a box smaller than this is a slip */
const STEP = 2;
const MIN_BOX = 6;

type Drawing = { kind: "pen"; points: [number, number][] } | { kind: "box"; from: [number, number]; to: [number, number] };

/** Selected marks: square handles in the app's blue, 8 around a box and the 4 corners of a stroke, each with the cursor for its direction. */
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const BOX_HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const PEN_HANDLES: Handle[] = ["nw", "ne", "se", "sw"];
const CURSORS: Record<Handle, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};
const SELECT = "#4c8ff0";
const HANDLE = 8;
/** marks are picked up by an invisible line this wide around them (the picture's points) */
const HIT = 14;
/** a press on a dot becomes a drag once it has moved this far (px) */
const DRAG = 3;
/** the smallest a resized mark gets, as a share of the picture */
const MIN_SIZE = 0.01;

type Rect = { x: number; y: number; w: number; h: number };

/** A mark's bounds, in fractions of the picture. */
function boundsOf(mark: ImageMark): Rect {
  if (mark.kind === "box") return { x: mark.x, y: mark.y, w: mark.w, h: mark.h };
  const xs = mark.points.map((p) => p[0]);
  const ys = mark.points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** The mark moved by (dx, dy), kept on the picture. */
function movedBy(mark: ImageMark, dx: number, dy: number): ImageMark {
  const r = boundsOf(mark);
  dx = Math.min(1 - r.x - r.w, Math.max(-r.x, dx));
  dy = Math.min(1 - r.y - r.h, Math.max(-r.y, dy));
  if (mark.kind === "box") return { ...mark, x: mark.x + dx, y: mark.y + dy };
  return { ...mark, points: mark.points.map(([x, y]) => [x + dx, y + dy]) };
}

/** The mark with the side or corner at `handle` dragged by (dx, dy); a stroke stretches with its bounds (and flips past them). */
function resizedBy(mark: ImageMark, handle: Handle, dx: number, dy: number): ImageMark {
  const r = boundsOf(mark);
  let x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h;
  if (handle.includes("w")) x0 = clamp(x0 + dx);
  if (handle.includes("e")) x1 = clamp(x1 + dx);
  if (handle.includes("n")) y0 = clamp(y0 + dy);
  if (handle.includes("s")) y1 = clamp(y1 + dy);
  if (mark.kind === "box") {
    const w = Math.max(MIN_SIZE, Math.abs(x1 - x0));
    const h = Math.max(MIN_SIZE, Math.abs(y1 - y0));
    return { ...mark, x: Math.min(x0, x1), y: Math.min(y0, y1), w, h };
  }
  const sx = r.w ? (x1 - x0) / r.w : 1;
  const sy = r.h ? (y1 - y0) / r.h : 1;
  return { ...mark, points: mark.points.map(([x, y]) => [x0 + (x - r.x) * sx, y0 + (y - r.y) * sy]) };
}

/** What the pointer is doing on the picture, from press to release. */
type Gesture =
  | { kind: "move"; id: string; from: [number, number]; mark: ImageMark; changed: boolean }
  | { kind: "resize"; id: string; handle: Handle; from: [number, number]; mark: ImageMark; changed: boolean }
  | { kind: "dot"; id: string; screen: { x: number; y: number }; moved: boolean };

export function ScratchLayer({
  scratch,
  size,
  scale,
  tool,
  ink,
  annotating,
  open,
  selected,
  onPlace,
  onOpen,
  onChange,
  onMark,
  onSelect,
  onBeginEdit,
  onEditMark,
  onMoveNote,
}: {
  scratch: ImageScratch;
  /** the picture's own size (pt), before it's scaled on screen */
  size: { w: number; h: number };
  /** the picture's scale on screen, which the dots, notes and handles undo */
  scale: MotionValue<number>;
  /** what a press on the picture does; none outside the scratchpad */
  tool: ScratchTool | null;
  ink: string;
  /** in the scratchpad: dots open their notes (in the viewer, they're just dots) */
  annotating: boolean;
  open: OpenNote;
  /** the selected mark */
  selected: string | null;
  onPlace: (x: number, y: number) => void;
  /** open a note to read or write in, or close the open one (null) */
  onOpen: (next: OpenNote) => void;
  onChange: (id: string, text: string) => void;
  onMark: (mark: ImageMark) => void;
  onSelect: (id: string | null) => void;
  /** a drag is about to change what's on the picture (once per drag, so it undoes in one step) */
  onBeginEdit: () => void;
  onEditMark: (mark: ImageMark) => void;
  onMoveNote: (id: string, x: number, y: number) => void;
}) {
  const unscale = useTransform(scale, (s) => 1 / s);
  const layer = useRef<HTMLDivElement>(null);
  // the mark being drawn, until the pointer lifts
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const gesture = useRef<Gesture | null>(null);
  // a dot that was dragged doesn't also open its note
  const dragged = useRef<string | null>(null);
  const { notes, marks } = scratch;
  const picked = marks.find((m) => m.id === selected) ?? null;

  const at = (e: React.PointerEvent): [number, number] => {
    const r = layer.current!.getBoundingClientRect();
    return [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)];
  };

  // the mark ends where the pointer lifts, whatever the last move to be drawn was
  const finish = (e: React.PointerEvent) => {
    if (!drawing) return;
    setDrawing(null);
    const end = at(e);
    if (drawing.kind === "pen") {
      const points = [...drawing.points, end];
      if (points.length > 1) onMark({ id: scratchId("pen"), kind: "pen", ink, points });
      return;
    }
    const [x0, y0] = drawing.from;
    const [x1, y1] = end;
    const box = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
    if (box.w * size.w >= MIN_BOX && box.h * size.h >= MIN_BOX) onMark({ id: scratchId("box"), kind: "box", ink, ...box });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tool || e.button !== 0) return;
    e.stopPropagation();
    const target = e.target as Element;
    const p = at(e);
    const handle = target.closest("[data-handle]")?.getAttribute("data-handle") as Handle | null;
    const hit = target.closest("[data-mark]")?.getAttribute("data-mark");
    const onFrame = !!target.closest("[data-frame]");
    // a press on a mark selects it and can drag it; on a handle, resizes it
    if (picked && handle) gesture.current = { kind: "resize", id: picked.id, handle, from: p, mark: picked, changed: false };
    else if (picked && onFrame) gesture.current = { kind: "move", id: picked.id, from: p, mark: picked, changed: false };
    else if (hit) {
      const mark = marks.find((m) => m.id === hit)!;
      if (open) onOpen(null);
      onSelect(hit);
      gesture.current = { kind: "move", id: hit, from: p, mark, changed: false };
    }
    if (gesture.current) return e.currentTarget.setPointerCapture(e.pointerId);
    // anywhere else lets go of the selection and does what the tool does
    if (selected) onSelect(null);
    if (tool === "text") return onPlace(...p);
    // drawing starts by folding any open note
    if (open) onOpen(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = { x: e.clientX, y: e.clientY };
    setDrawing(tool === "pen" ? { kind: "pen", points: [p] } : { kind: "box", from: p, to: p });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g?.kind === "dot") {
      if (!g.moved && Math.hypot(e.clientX - g.screen.x, e.clientY - g.screen.y) < DRAG) return;
      // only a press that moves takes the pointer, so one that doesn't stays a click on the dot
      if (!g.moved) {
        onBeginEdit();
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      g.moved = true;
      return onMoveNote(g.id, ...at(e));
    }
    if (g) {
      const [x, y] = at(e);
      const dx = x - g.from[0];
      const dy = y - g.from[1];
      if (!g.changed && !dx && !dy) return;
      if (!g.changed) onBeginEdit();
      g.changed = true;
      return onEditMark(g.kind === "move" ? movedBy(g.mark, dx, dy) : resizedBy(g.mark, g.handle, dx, dy));
    }
    if (!drawing) return;
    if (drawing.kind === "box") return setDrawing({ ...drawing, to: at(e) });
    const l = last.current;
    if (l && Math.hypot(e.clientX - l.x, e.clientY - l.y) < STEP) return;
    last.current = { x: e.clientX, y: e.clientY };
    setDrawing({ ...drawing, points: [...drawing.points, at(e)] });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.kind === "dot") {
      if (g.moved) dragged.current = g.id;
      return;
    }
    if (!g) finish(e);
  };

  return (
    <div
      ref={layer}
      className="absolute inset-0"
      style={{ pointerEvents: tool ? "auto" : "none", cursor: tool ? "crosshair" : undefined }}
      // keep focus where it is: a note that opens takes it itself
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        gesture.current = null;
        setDrawing(null);
      }}
    >
      {/* marks, in the picture's own points: they scale with it. Only their lines pick them up. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full overflow-visible"
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ filter: "drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.45))" }}
      >
        {marks.map((m) => (
          <Mark key={m.id} mark={m} size={size} pickable={!!tool && !drawing} />
        ))}
        {drawing && <Mark mark={drawingMark(drawing, ink)} size={size} live />}
      </svg>

      {picked && tool && !drawing && <Selection mark={picked} unscale={unscale} />}

      <AnimatePresence>
        {notes.map((n, i) => {
          const isOpen = open?.id === n.id;
          return (
            <motion.div
              key={n.id}
              className="absolute size-0"
              style={{
                left: `${n.x * 100}%`,
                top: `${n.y * 100}%`,
                scale: unscale,
                transformOrigin: "0 0",
                zIndex: isOpen ? 2 : 1,
                // while drawing, presses pass through to the picture
                pointerEvents: annotating && !drawing ? "auto" : "none",
              }}
            >
              <motion.button
                type="button"
                aria-label={`Note ${i + 1}${n.text ? `: ${n.text}` : ""}`}
                aria-expanded={annotating ? isOpen : undefined}
                className="absolute flex cursor-default items-center justify-center rounded-full text-[11px] font-semibold tabular-nums"
                style={{
                  left: -DOT / 2,
                  top: -DOT / 2,
                  width: DOT,
                  height: DOT,
                  background: n.ink,
                  color: LIGHT_INKS.has(n.ink) ? "#151515" : "#fff",
                  boxShadow: "0 0 0 2px rgb(255 255 255 / 0.92), 0 2px 8px rgb(0 0 0 / 0.45)",
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1, transition: { type: "spring", duration: 0.3, bounce: 0.35 } }}
                exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
                onMouseDown={(e) => e.preventDefault()}
                // a dot can be dragged to another spot; a press that stays put opens its note
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (!annotating || e.button !== 0) return;
                  if (selected) onSelect(null);
                  dragged.current = null;
                  gesture.current = { kind: "dot", id: n.id, screen: { x: e.clientX, y: e.clientY }, moved: false };
                }}
                onClick={() => {
                  if (dragged.current === n.id) return void (dragged.current = null);
                  onOpen(isOpen ? null : { id: n.id, edit: !n.text });
                }}
              >
                {i + 1}
              </motion.button>
              <AnimatePresence>
                {annotating && isOpen && (
                  <Note key="note" note={n} edit={open.edit} flip={n.x > FLIP_AT} onOpen={onOpen} onChange={onChange} />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** The selected mark's handles (drag one to resize) and, unseen between them, its frame (drag it to move the mark). */
function Selection({ mark, unscale }: { mark: ImageMark; unscale: MotionValue<number> }) {
  const r = boundsOf(mark);
  const handles = mark.kind === "box" ? BOX_HANDLES : PEN_HANDLES;
  return (
    <>
      <div
        data-frame
        className="absolute"
        style={{
          left: `${r.x * 100}%`,
          top: `${r.y * 100}%`,
          width: `${r.w * 100}%`,
          height: `${r.h * 100}%`,
          cursor: "move",
        }}
      />
      {handles.map((h) => {
        const fx = h.includes("w") ? 0 : h.includes("e") ? 1 : 0.5;
        const fy = h.includes("n") ? 0 : h.includes("s") ? 1 : 0.5;
        return (
          <motion.div
            key={h}
            className="absolute size-0"
            style={{ left: `${(r.x + r.w * fx) * 100}%`, top: `${(r.y + r.h * fy) * 100}%`, scale: unscale, transformOrigin: "0 0", zIndex: 1 }}
          >
            <span
              data-handle={h}
              aria-hidden
              className="absolute rounded-[2px] bg-white"
              style={{
                left: -HANDLE / 2,
                top: -HANDLE / 2,
                width: HANDLE,
                height: HANDLE,
                boxShadow: `inset 0 0 0 1.5px ${SELECT}, 0 1px 3px rgb(0 0 0 / 0.35)`,
                cursor: CURSORS[h],
              }}
            />
          </motion.div>
        );
      })}
    </>
  );
}

function drawingMark(d: Drawing, ink: string): ImageMark {
  if (d.kind === "pen") return { id: "live", kind: "pen", ink, points: d.points };
  const [x0, y0] = d.from;
  const [x1, y1] = d.to;
  return { id: "live", kind: "box", ink, x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
}

function Mark({ mark, size, live, pickable }: { mark: ImageMark; size: { w: number; h: number }; live?: boolean; pickable?: boolean }) {
  const common = { stroke: mark.ink, strokeWidth: STROKE, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  // an invisible, wider copy of the line is what a press picks the mark up by
  const hit = pickable ? ({ stroke: "transparent", strokeWidth: HIT, fill: "none", style: { pointerEvents: "stroke", cursor: "move" } } as const) : null;
  if (mark.kind === "box") {
    const box = { x: mark.x * size.w, y: mark.y * size.h, width: mark.w * size.w, height: mark.h * size.h, rx: BOX_RADIUS };
    return (
      <g data-mark={mark.id}>
        <rect {...box} {...common} />
        {hit && <rect {...box} {...hit} />}
      </g>
    );
  }
  const d = smooth(mark.points.map(([x, y]) => [x * size.w, y * size.h]));
  return (
    <g data-mark={mark.id}>
      {/* a finished stroke settles in; the live one is just there */}
      {live ? <path d={d} {...common} /> : <motion.path d={d} {...common} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} />}
      {hit && <path d={d} {...hit} strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
}

/** A path through the points, rounded off by running through each pair's midpoint. */
function smooth(points: number[][]) {
  if (points.length === 0) return "";
  if (points.length < 3) return `M${points.map((p) => p.join(" ")).join(" L")}`;
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const end = points[points.length - 1];
  return `${d} L${end[0]} ${end[1]}`;
}

function Note({
  note,
  edit,
  flip,
  onOpen,
  onChange,
}: {
  note: ImageNote;
  edit: boolean;
  flip: boolean;
  onOpen: (next: OpenNote) => void;
  onChange: (id: string, text: string) => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  // the field grows with what's typed
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${el.scrollHeight}px`;
  }, [note.text, edit]);

  return (
    <motion.div
      className="absolute flex items-start gap-[8px] rounded-[12px] bg-[#1d1d1d]/95 text-[13px] text-[#ebeae6] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_8px_24px_rgb(0_0_0/0.35)] backdrop-blur-md"
      style={{
        top: -(PAD_Y + LINE / 2),
        padding: `${PAD_Y}px ${PAD_X}px`,
        lineHeight: `${LINE}px`,
        width: edit ? NOTE_W : "max-content",
        maxWidth: NOTE_W,
        ...(flip ? { right: DOT / 2 + NOTE_GAP } : { left: DOT / 2 + NOTE_GAP }),
        transformOrigin: flip ? "right center" : "left center",
      }}
      initial={{ opacity: 0, scale: 0.96, x: flip ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, x: 0, transition: { type: "spring", duration: 0.26, bounce: 0 } }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {edit ? (
        <textarea
          ref={field}
          autoFocus
          rows={1}
          value={note.text}
          placeholder="Add a note…"
          aria-label="Note"
          className="block min-w-0 flex-1 resize-none bg-transparent outline-none select-text placeholder:text-[#868580]"
          onFocus={(e) => e.currentTarget.setSelectionRange(note.text.length, note.text.length)}
          onChange={(e) => onChange(note.id, e.target.value)}
          // leaving the field keeps what's written and folds the note into its dot
          onBlur={() => onOpen(null)}
          onKeyDown={(e) => {
            // Escape closes the note, not the scratchpad
            if (e.key === "Escape") e.stopPropagation();
            if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing)) {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      ) : (
        <>
          <p className="min-w-0 flex-1 break-words whitespace-pre-wrap">{note.text}</p>
          {/* level with the first line, standing a little proud of it */}
          <button
            type="button"
            aria-label="Edit note"
            title="Edit"
            className="-my-[3px] -mr-[6px] flex size-[24px] shrink-0 cursor-default items-center justify-center rounded-[6px] text-[#a3a29c] hover:bg-white/[0.08] hover:text-[#ebeae6]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onOpen({ id: note.id, edit: true })}
          >
            <Icon name="pen" size={13} />
          </button>
        </>
      )}
    </motion.div>
  );
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** A note as it travels with a baked image: its number (as drawn on the dot), where it is (fractions, and pixels of the baked image), what it says and its dot's ink. */
export type BakedNote = { n: number; x: number; y: number; px: [number, number]; text: string; ink: string };

/** An image with its scratches drawn in, ready to attach: the new picture, and the notes its dots stand for. */
export type BakedImage = { src: string; width: number; height: number; notes: BakedNote[] };

/** the longest side a baked image keeps (px): enough to read, not a whole screen's worth of memory per attachment */
const BAKE_MAX = 2560;

/**
 * Draws a picture's marks and numbered dots into a new image at the
 * picture's own resolution. Sizes follow what was on screen: marks by the
 * picture's width before scaling (`markWidth`, as they scale with it), dots by
 * its width as shown in the scratchpad (`shownWidth`, as they don't).
 */
export async function bakeScratch(src: string, scratch: ImageScratch, markWidth: number, shownWidth: number): Promise<BakedImage> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const fit = Math.min(1, BAKE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * fit);
  const H = Math.round(img.naturalHeight * fit);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, W, H);

  const m = W / markWidth;
  const d = W / shownWidth;
  const shadow = (blur: number, y: number) => {
    ctx.shadowColor = "rgb(0 0 0 / 0.45)";
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = y;
  };

  // marks, as the layer draws them
  shadow(1.5 * m, 1 * m);
  ctx.lineWidth = STROKE * m;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const mark of scratch.marks) {
    ctx.strokeStyle = mark.ink;
    if (mark.kind === "pen") {
      ctx.stroke(new Path2D(smooth(mark.points.map(([x, y]) => [x * W, y * H]))));
      continue;
    }
    ctx.beginPath();
    ctx.roundRect(mark.x * W, mark.y * H, mark.w * W, mark.h * H, BOX_RADIUS * m);
    ctx.stroke();
  }

  // dots: a white ring around the ink, the number in the middle
  const font = getComputedStyle(document.body).fontFamily;
  scratch.notes.forEach((note, i) => {
    const x = note.x * W;
    const y = note.y * H;
    shadow(8 * d, 2 * d);
    ctx.fillStyle = "rgb(255 255 255 / 0.92)";
    ctx.beginPath();
    ctx.arc(x, y, (DOT / 2 + 2) * d, 0, Math.PI * 2);
    ctx.fill();
    shadow(0, 0);
    ctx.fillStyle = note.ink;
    ctx.beginPath();
    ctx.arc(x, y, (DOT / 2) * d, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = LIGHT_INKS.has(note.ink) ? "#151515" : "#fff";
    ctx.font = `600 ${11 * d}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), x, y + 0.5 * d);
  });

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("couldn't encode the image"))), "image/png"));
  return {
    src: URL.createObjectURL(blob),
    width: W,
    height: H,
    notes: scratch.notes.map((n, i) => ({ n: i + 1, x: n.x, y: n.y, px: [Math.round(n.x * W), Math.round(n.y * H)], text: n.text.trim(), ink: n.ink })),
  };
}
